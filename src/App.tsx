import React, { RefObject, createRef } from 'react';
import './App.css';
import { CHIPS } from 'circuit-simulator';
import { Chip, ChipInfo } from 'circuit-simulator/src/Chip';

interface ChipProps {
  id:string;
  info:ChipInfo;
  hooks:{
    onChipMouseDown:(id:string,e:React.MouseEvent)=>void;
  }
}

class ChipUI extends React.Component<ChipProps> {
  #chipRef:RefObject<HTMLDivElement> = React.createRef();
  #pinRefs:{[pin:string]:RefObject<HTMLDivElement>} = 
    Object.fromEntries(
      this.props.info.inputPins.concat(this.props.info.outputPins)
                               .map(pin=>[pin,React.createRef()])
    );
  renderCustomBody(): React.ReactNode {
    return <div></div>;
  }
  onBodyMouseDown(e:React.MouseEvent){
    e.preventDefault();
    e.stopPropagation();
    this.props.hooks.onChipMouseDown(this.props.id,e);
  }
  getPinOffset(pin:string):{x:number,y:number}{
    const ref = this.#pinRefs[pin]?.current;
    if(ref === undefined || ref === null){
      throw new Error('Pin not found');
    }
    const chipRef = this.#chipRef.current;
    if(chipRef === null){
      throw new Error('Chip not found');
    }
    const rect = ref.getBoundingClientRect();
    const rectChip = chipRef.getBoundingClientRect();
    const leftPin = this.props.info.inputPins.includes(pin);
    return {
      x:(leftPin?rect.x:rect.x+rect.width) - rectChip.x,
      y:rect.y+rect.height/2 - rectChip.y
    };
  }
  render(): React.ReactNode {
    return (
      <div className='Chip' ref={this.#chipRef}>
        <div className='ChipInputs'>
          {this.props.info.inputPins.map(pin=>
            <div className='ChipInput' ref={this.#pinRefs[pin]} key={pin}>{pin}</div>
          )}
        </div>
        <div className='ChipBody' 
          onMouseDown={this.onBodyMouseDown.bind(this)}>
          <div className='ChipBodyType'>
            {this.props.info.name}
          </div>
          {this.renderCustomBody()}
        </div>
        <div className='ChipOutputs'>
          {this.props.info.outputPins.map(pin=>
            <div className='ChipOutput' ref={this.#pinRefs[pin]} key={pin}>{pin}</div>
          )}
        </div>
      </div>
    );
  }
}

interface ConnectionProps {
  info:{
    chipA:string;
    pinA:string;
    chipB:string;
    pinB:string;
    src:{x:number,y:number};
    dst:{x:number,y:number};
  }
}

class ConnectionUI extends React.Component<ConnectionProps> {
  render(): React.ReactNode {
    const anchorX = Math.min(this.props.info.src.x,this.props.info.dst.x);
    const anchorY = Math.min(this.props.info.src.y,this.props.info.dst.y);
    const width = Math.abs(this.props.info.dst.x-this.props.info.src.x);
    const height = Math.abs(this.props.info.dst.y-this.props.info.src.y);
    return (
      <svg className='Connection' 
        width={width + 10} 
        height={height + 10}>
        <line x1={this.props.info.src.x - anchorX + 5} 
              y1={this.props.info.src.y - anchorY + 5} 
              x2={this.props.info.dst.x - anchorX + 5} 
              y2={this.props.info.dst.y - anchorY + 5} />
      </svg>
    );
  }
}

interface AddChipDialogProps {
  hidden:boolean;
  info:{[chipName:string]:ChipInfo};
  hooks:{
    onAddChip:(chipName:keyof typeof CHIPS|undefined)=>void;
  };
}

class AddChipDialog extends React.Component<AddChipDialogProps> {
  render(): React.ReactNode {
    if(this.props.hidden){
      return <div/>;
    }
    return (
      <div className='AddChipDialog'>
        <div className='AddChipDialogHeader'>
          <div className='AddChipDialogHeaderText'>Add Chip</div>
          <button className='MenuButton' onClick={()=>{
            this.props.hooks.onAddChip(undefined);
          }}>Cancel</button>
        </div>
        <div className='AddChipDialogBody'>
          {Object.entries(this.props.info).map(([n,c])=>
            <div key={c.name} className='AddChipDialogChip'
              onClick={()=>{this.props.hooks.onAddChip(n as keyof typeof CHIPS)}}  
            >
              <div className='AddChipDialogChipName'>{c.name}</div>
              <div className='AddChipDialogChipDetail'>{c.description}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

class App extends React.Component {
  #chipMoving = false;
  #movingChip = '';
  #chipMovingOffset = {x:0,y:0};
  #listenersSet = false;
  #spaceDown = false;
  #screenMoving = false;
  #screenMovingOffset = {x:0,y:0};
  state:{
    canvasPosition:{x:number,y:number};
    chips:{[id:string]:{
      position:{x:number,y:number};
      info:ChipInfo;
      ref:RefObject<ChipUI>;
    }};
    connections:Array<{
      chipA:string;
      pinA:string;
      chipB:string;
      pinB:string;
      src:{x:number,y:number};
      dst:{x:number,y:number};
    }>;
    showAddChipDialog:boolean;
  } = {
    canvasPosition:{x:0,y:0},
    chips:{},
    connections:[],
    showAddChipDialog:false,
  };
  onChipMouseDown(id:string,e:React.MouseEvent){
    this.#chipMoving = true;
    this.#movingChip = id;
    this.#chipMovingOffset = {
      x:e.screenX-this.state.chips[id].position.x,
      y:e.screenY-this.state.chips[id].position.y
    };
  }
  onMouseDown(e:MouseEvent){
    if(this.#spaceDown){
      this.#screenMoving = true;
      this.#screenMovingOffset = {
        x:e.screenX-this.state.canvasPosition.x,
        y:e.screenY-this.state.canvasPosition.y
      };
    }
  }
  onMouseUp(e:MouseEvent){
    if(this.#chipMoving){
      this.#chipMoving = false;
    }
    if(this.#screenMoving){
      this.#screenMoving = false;
    }
  }
  onMouseMove(e:MouseEvent){
    if(this.#chipMoving){
      e.preventDefault();
      e.stopPropagation();
      const x = e.screenX-this.#chipMovingOffset.x;
      const y = e.screenY-this.#chipMovingOffset.y;
      this.setState({
        chips:{
          ...this.state.chips,
          [this.#movingChip]:{
            ...this.state.chips[this.#movingChip],
            position:{x,y}
          }
        }
      });
      return;
    }
    if(this.#screenMoving){
      e.preventDefault();
      e.stopPropagation();
      const x = e.screenX-this.#screenMovingOffset.x;
      const y = e.screenY-this.#screenMovingOffset.y;
      this.setState({
        canvasPosition:{x,y}
      });
      return;
    }
  }
  onKeyDown(e:KeyboardEvent){
    if(e.key === ' '){
      this.#spaceDown = true;
      e.preventDefault();
      e.stopPropagation();
    }
  }
  onKeyUp(e:KeyboardEvent){
    if(e.key === ' '){
      this.#spaceDown = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }
  onAddChipButtonClick(){
    this.setState({showAddChipDialog:true});
  }
  async onAddChip(chipName:keyof typeof CHIPS|undefined){
    if(chipName === undefined){
      this.setState({showAddChipDialog:false});
      return;
    }
    const chipClass = CHIPS[chipName];
    let chipId:string;
    do {
      chipId = ((Math.random()*0xFFFFFFFF)>>>0).toString(32);
    } while (this.state.chips[chipId] !== undefined);
    this.setState({
      showAddChipDialog:false,
      chips:{
        ...this.state.chips,
        [chipId]:{
          info:chipClass.info,
          ref:createRef(),
          position:{x:100,y:100}
        }
      }
    })
  }
  componentDidMount(): void {
    if(this.#listenersSet) {
      return;
    }
    this.#listenersSet = true;
    window.addEventListener('mousedown',this.onMouseDown.bind(this));
    window.addEventListener('mousemove',this.onMouseMove.bind(this));
    window.addEventListener('mouseup',this.onMouseUp.bind(this));
    window.addEventListener('keydown',this.onKeyDown.bind(this));
    window.addEventListener('keyup',this.onKeyUp.bind(this));
    /** To init the lines */
    this.setState(this.state);
  }
  getConnectionPositions():Array<{
    chipA:string;
    pinA:string;
    chipB:string;
    pinB:string;
    src:{x:number,y:number};
    dst:{x:number,y:number};
  }>{
    let connections = [];
    for(const c of this.state.connections){
      const srcOffset = this.state.chips[c.chipA].ref.current?.getPinOffset(c.pinA);
      const dstOffset = this.state.chips[c.chipB].ref.current?.getPinOffset(c.pinB);
      if(srcOffset === undefined || dstOffset === undefined){
        continue;
      }
      const srcChip = {x:this.state.chips[c.chipA].position.x,y:this.state.chips[c.chipA].position.y};
      const dstChip = {x:this.state.chips[c.chipB].position.x,y:this.state.chips[c.chipB].position.y};
      connections.push({
        ...c,
        src:{x:srcChip.x+srcOffset.x,y:srcChip.y+srcOffset.y},
        dst:{x:dstChip.x+dstOffset.x,y:dstChip.y+dstOffset.y}
      });
    }
    return connections;
  }
  setState(s:React.SetStateAction<any>){
    /** render chips first, then update connections */
    super.setState(s,()=>{
      super.setState({connections:this.getConnectionPositions()});
    });
  }
  render() {
    return (
      <div className="App">
        <div className='Canvas' style={{left:this.state.canvasPosition.x,top:this.state.canvasPosition.y}}>
          {Object.entries(this.state.chips).map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUI ref={c.ref} {...{id:n,info:c.info,hooks:{
                onChipMouseDown:this.onChipMouseDown.bind(this)
              }}} />
            </div>
          )}
          {this.state.connections.map((c,i)=>
            <div key={i} className='ConnectionContainer' 
              style={{left:Math.min(c.src.x,c.dst.x)-5,top:Math.min(c.src.y,c.dst.y)-5}}>
              <ConnectionUI {...{info:c}}/>
            </div>
          )}
        </div>
        <div className='Menu'>
          <button className='MenuButton' onClick={this.onAddChipButtonClick.bind(this)}>Add Chip</button>
          <button className='MenuButton'>Simulate</button>
          <button className='MenuButton'>Update</button>
        </div>
        <AddChipDialog 
          hidden={!this.state.showAddChipDialog}
          info={Object.fromEntries(Object.entries(CHIPS).map(([n,c])=>[n,c.info]))} 
          hooks={{
            onAddChip:this.onAddChip.bind(this)
          }}
        />
      </div>
    );
  }
}

export default App;
