import React, { RefObject, createRef } from 'react';
import './App.css';
import { CHIPS, Circuit, Connection } from 'circuit-simulator';
import { Chip, ChipInfo } from 'circuit-simulator/src/Chip';
import { Network } from 'circuit-simulator/src/Network';

interface ChipProps {
  id:string;
  info:ChipInfo;
  hooks:{
    onChipMouseDown:(id:string,e:React.MouseEvent)=>void;
    onPinMouseDown:(chip:string,pin:string,e:React.MouseEvent)=>void;
    onPinMouseUp:(chip:string,pin:string,e:React.MouseEvent)=>void;
    setChipState?:(id:string, state:string, value:any)=>void;
    getChipState?:(id:string, state:string)=>any;
  };
  selected:boolean;
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
            <div className='ChipInput' ref={this.#pinRefs[pin]} key={pin}
              onMouseDown={(e)=>{this.props.hooks.onPinMouseDown(this.props.id,pin,e)}}
              onMouseUp={(e)=>(this.props.hooks.onPinMouseUp(this.props.id,pin,e))}
            ><div className='PinText'>{pin}</div></div>
          )}
        </div>
        <div className={this.props.selected?'ChipBody ChipBodySelected':'ChipBody'} 
          onMouseDown={this.onBodyMouseDown.bind(this)}>
          <div className='ChipBodyType'>
            {this.props.info.name}
          </div>
          {this.renderCustomBody()}
        </div>
        <div className='ChipOutputs'>
          {this.props.info.outputPins.map(pin=>
            <div className='ChipOutput' ref={this.#pinRefs[pin]} key={pin}
              onMouseDown={(e)=>{this.props.hooks.onPinMouseDown(this.props.id,pin,e)}}
              onMouseUp={(e)=>(this.props.hooks.onPinMouseUp(this.props.id,pin,e))}
            ><div className='PinText'>{pin}</div></div>
          )}
        </div>
      </div>
    );
  }
}

class ChipUIToggle extends ChipUI {
  state:{level:boolean} = {
    level:false
  };
  renderCustomBody(): React.ReactNode {
    return (
      <button className='ChipBodyToggle'
        onClick={()=>{
          /** Default old level to true to default the new level to false */
          let oldLevel = true;
          try {
            oldLevel = this.props.hooks.getChipState?.(this.props.id,'level')??true;
          } catch (error) {}
          try {
            this.props.hooks.setChipState?.(this.props.id,'level',!oldLevel);
          } catch (error) {}
          this.setState({level:!oldLevel});
        }}>
        Toggle:{this.state.level?'H':'L'}
      </button>
    );
  }
}

class ChipUIProbe extends ChipUI {
  renderCustomBody(): React.ReactNode {
    let value:string = '??';
    try {
      value = this.props.hooks.getChipState?.(this.props.id,'value')??'??';
    } catch (error) {}
    return (
      <div className='ChipBodyProbe'>
        {value}
      </div>
    );
  }
}

interface ConnectionProps {
  index?:number,
  info:{
    src:{x:number,y:number};
    dst:{x:number,y:number};
  },
  lineType?:string,
  hooks?:{
    onMouseDown:(index:number,e:React.MouseEvent)=>void;
  }
}

class ConnectionUI extends React.Component<ConnectionProps> {
  onMouseDown(e:React.MouseEvent){
    this.props.hooks?.onMouseDown(this.props.index??-1,e);
  }
  render(): React.ReactNode {
    const anchorX = Math.min(this.props.info.src.x,this.props.info.dst.x);
    const anchorY = Math.min(this.props.info.src.y,this.props.info.dst.y);
    const width = Math.abs(this.props.info.dst.x-this.props.info.src.x);
    const height = Math.abs(this.props.info.dst.y-this.props.info.src.y);
    return (
      <svg className={this.props.lineType!==undefined?`Connection ConnectionType${this.props.lineType}`:'Connection'} 
        width={width + 10} 
        height={height + 10}>
        <line className='ConnectionLine'
              x1={this.props.info.src.x - anchorX + 5} 
              y1={this.props.info.src.y - anchorY + 5} 
              x2={this.props.info.dst.x - anchorX + 5} 
              y2={this.props.info.dst.y - anchorY + 5} 
              onMouseDown={this.onMouseDown.bind(this)}/>
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
  #circuit:Circuit|undefined = undefined;
  #chips:Map<string,Chip> = new Map();
  #connectionToNetwork:Map<number,Network> = new Map();
  state:{
    canvasPosition:{x:number,y:number};
    chips:{[id:string]:{
      position:{x:number,y:number};
      type:keyof typeof CHIPS;
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
    simulationActive:boolean;
    drawLine?:{
      srcChip:string;
      srcPin:string;
      src:{x:number,y:number};
      dst:{x:number,y:number};
    };
    selectedChip?:string;
    selectedConnection?:number;
  } = {
    canvasPosition:{x:0,y:0},
    chips:{},
    connections:[],
    showAddChipDialog:false,
    simulationActive:false
  };
  setChipState(id:string, state:string, value:any){
    const chip = this.#chips.get(id);
    if(chip === undefined){
      throw new Error('Chip not found');
    }
    /** This is not good behavior */
    chip[state as keyof Chip] = value;
  }
  getChipState(id:string, state:string):any{
    const chip = this.#chips.get(id);
    if(chip === undefined){
      throw new Error('Chip not found');
    }
    /** This is not good behavior */
    return chip[state as keyof Chip];
  }
  getConnectionType(index:number):string|undefined{
    if(this.state.selectedConnection === index){
      return 'Selected';
    }
    const network = this.#connectionToNetwork.get(index);
    if(network !== undefined){
      switch (network.state){
        /** The Fucking stupid tsx parser cannot handle typescript enum. */
        case 1:
          return 'High';
        case 0:
          return 'Low';
        case -2:
          return 'Conflict';
        case -1:
          return 'HighImpedance';
      }
    }
    return undefined;
  }
  onChipMouseDown(id:string,e:React.MouseEvent){
    if(this.state.simulationActive){
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    this.#chipMoving = true;
    this.#movingChip = id;
    this.#chipMovingOffset = {
      x:e.screenX-this.state.chips[id].position.x,
      y:e.screenY-this.state.chips[id].position.y
    };
    this.setState({
      selectedChip:id,
      selectedConnection:undefined
    });
  }
  onPinMouseDown(chip:string,pin:string,e:React.MouseEvent){
    if(this.state.simulationActive){
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    this.setState({
      drawLine:{
        srcChip:chip,
        srcPin:pin,
        src:{x:0,y:0},
        dst:{x:e.clientX-this.state.canvasPosition.x,y:e.clientY-this.state.canvasPosition.y}
      },
      selectedChip:undefined,
      selectedConnection:undefined,
    })
  }
  onPinMouseUp(chip:string,pin:string,e:React.MouseEvent){
    if(this.state.drawLine===undefined){
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    /** check for self conection and existing connections */
    let onlyClearDrawingLine = false;
    do {
      if(this.state.drawLine.srcChip===chip && this.state.drawLine.srcPin===pin){
        onlyClearDrawingLine = true;
        break;
      }
      for(const c of this.state.connections){
        if((c.chipA===this.state.drawLine.srcChip && c.pinA===this.state.drawLine.srcPin 
            && c.chipB===chip && c.pinB===pin)
          ||(c.chipB===this.state.drawLine.srcChip && c.pinB===this.state.drawLine.srcPin 
            && c.chipA===chip && c.pinA===pin))
        {
          onlyClearDrawingLine = true;
          break;
        }
      }
    } while (false);
    if(onlyClearDrawingLine){
      this.setState({
        drawLine:undefined
      });
      return;
    }
    this.setState({
      drawLine:undefined,
      connections:[
        ...this.state.connections,
        {
          chipA:this.state.drawLine.srcChip,
          pinA:this.state.drawLine.srcPin,
          chipB:chip,
          pinB:pin,
          src:{...this.state.drawLine.src},
          dst:{...this.state.drawLine.dst}
        }
      ]
    });
  }
  onConnectionMouseDown(index:number, e:React.MouseEvent){
    if(this.state.simulationActive){
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    this.setState({
      selectedChip:undefined,
      selectedConnection:index
    });
  }
  onMouseDown(e:MouseEvent){
    if(this.#spaceDown){
      this.#screenMoving = true;
      this.#screenMovingOffset = {
        x:e.screenX-this.state.canvasPosition.x,
        y:e.screenY-this.state.canvasPosition.y
      };
    }
    if(this.state.selectedChip!==undefined || this.state.selectedConnection!==undefined){
      this.setState({
        selectedChip:undefined,
        selectedConnection:undefined
      });
    }  
  }
  onMouseUp(e:MouseEvent){
    if(this.#chipMoving){
      this.#chipMoving = false;
    }
    if(this.#screenMoving){
      this.#screenMoving = false;
    }
    if(this.state.drawLine !== undefined){
      this.setState({drawLine:undefined});
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
    if(this.state.drawLine !== undefined){
      e.preventDefault();
      e.stopPropagation();
      const x = e.clientX - this.state.canvasPosition.x;
      const y = e.clientY - this.state.canvasPosition.y;
      this.setState({
        drawLine:{
          ...this.state.drawLine,
          dst:{x,y}
        }
      });
      return;
    }
  }
  onKeyDown(e:KeyboardEvent){
    switch (e.key) {
      case ' ':
        this.#spaceDown = true;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'Delete':
        if(this.state.simulationActive){
          break;
        }
        e.preventDefault();
        e.stopPropagation();
        if(this.state.selectedChip !== undefined){
          this.setState({
            chips:Object.fromEntries(Object.entries(this.state.chips).filter(([n,c])=>n!==this.state.selectedChip)),
            connections:this.state.connections.filter(c=>c.chipA!==this.state.selectedChip&&c.chipB!==this.state.selectedChip),
            selectedChip:undefined,
          })
        }else if(this.state.selectedConnection !== undefined 
                && this.state.connections[this.state.selectedConnection]!==undefined){
          let connections = [];
          for(let i=0;i<this.state.connections.length;i++){
            if(i===this.state.selectedConnection){
              continue;
            }
            connections.push(this.state.connections[i]);
          }
          this.setState({
            connections:connections,
            selectedConnection:undefined
          });
        }
        break;
      default:
        break;
    }
  }
  onKeyUp(e:KeyboardEvent){
    switch (e.key){
      case ' ':
        this.#spaceDown = false;
        e.preventDefault();
        e.stopPropagation();
        break;
      default:
        break;
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
          type:chipName,
          info:chipClass.info,
          ref:createRef(),
          position:{x:100-this.state.canvasPosition.x,y:100-this.state.canvasPosition.y}
        }
      }
    })
  }
  onSimulateButtonClick():void {
    if(this.#circuit !== undefined){
      /** exit simulation */
      this.#circuit = undefined;
      this.#chips.clear();
      this.#connectionToNetwork.clear();
      this.setState({simulationActive:false});
      return;
    }
    this.#circuit = new Circuit();
    for(const [n,c] of Object.entries(this.state.chips)){
      const chip = new CHIPS[c.type]();
      this.#circuit.chips.add(chip);
      this.#chips.set(n,chip);
    }
    let connections = [];
    for(const c of this.state.connections){
      const chipA = this.#chips.get(c.chipA);
      const chipB = this.#chips.get(c.chipB);
      if(chipA === undefined || chipB === undefined){
        throw new Error('Chip not found');
      }        
      const pinA = chipA.getPin(c.pinA);
      const pinB = chipB.getPin(c.pinB);
      connections.push(new Connection(pinA, pinB));
    }
    this.#circuit.networks = Connection.getNetworks(connections);
    for(let i = 0; i < this.state.connections.length; i++){
      const c = this.state.connections[i];
      const chipA = this.#chips.get(c.chipA);
      if(chipA === undefined){
        throw new Error('Chip not found');
      }
      const pinA = chipA.getPin(c.pinA);
      for(const n of this.#circuit.networks){
        if(n.hasPin(pinA)){
          this.#connectionToNetwork.set(i,n);
          break;
        }
      }
    }
    this.setState({
      simulationActive:true,
      selectedChip:undefined,
      selectedConnection:undefined
    });
  }
  onUpdateButtonClick():void {
    if(this.#circuit === undefined){
      return;
    }
    try {
      this.#circuit.udpate();
      this.setState(this.state);
    } catch (error) {
      alert(`Error in circuit udpate:\n${error}`);
    }
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
  getPinPosition(chip:string, pin:string):{x:number,y:number}{
    const offset = this.state.chips[chip]?.ref.current?.getPinOffset(pin);
    if(offset === undefined){
      throw new Error('Pin not found');
    }
    const srcChip = {x:this.state.chips[chip].position.x, y:this.state.chips[chip].position.y};
    return {x:srcChip.x+offset.x, y:srcChip.y+offset.y};
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
      try {
        const src = this.getPinPosition(c.chipA, c.pinA);
        const dst = this.getPinPosition(c.chipB, c.pinB);
        connections.push({
          ...c,
          src,
          dst
        });
      } catch (error) {}
    }
    return connections;
  }
  setState(s:React.SetStateAction<any>){
    /** render chips first, then update connections */
    super.setState(s,()=>{
      super.setState({
        connections:this.getConnectionPositions(),
        drawLine:this.state.drawLine?{
          ...this.state.drawLine,
          src:this.getPinPosition(this.state.drawLine.srcChip,this.state.drawLine.srcPin)
        }:undefined
      });
    });
  }
  render() {
    return (
      <div className="App">
        <div className='Canvas' style={{left:this.state.canvasPosition.x,top:this.state.canvasPosition.y}}>
          {Object.entries(this.state.chips).filter(([n,c])=>!['ChipToggle','ChipProbe'].includes(c.type)).map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUI ref={c.ref} id={n} info={c.info} selected={n===this.state.selectedChip} hooks={{
                onChipMouseDown:this.onChipMouseDown.bind(this),
                onPinMouseDown:this.onPinMouseDown.bind(this),
                onPinMouseUp:this.onPinMouseUp.bind(this),
              }} />
            </div>
          )}
          {Object.entries(this.state.chips).filter(([n,c])=>c.type==='ChipProbe').map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUIProbe ref={c.ref} id={n} info={c.info} selected={n===this.state.selectedChip} hooks={{
                onChipMouseDown:this.onChipMouseDown.bind(this),
                onPinMouseDown:this.onPinMouseDown.bind(this),
                onPinMouseUp:this.onPinMouseUp.bind(this),
                getChipState:this.getChipState.bind(this),
              }} />
            </div>
          )}
          {Object.entries(this.state.chips).filter(([n,c])=>c.type==='ChipToggle').map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUIToggle ref={c.ref as RefObject<ChipUIToggle>} id={n} info={c.info} selected={n===this.state.selectedChip} hooks={{
                onChipMouseDown:this.onChipMouseDown.bind(this),
                onPinMouseDown:this.onPinMouseDown.bind(this),
                onPinMouseUp:this.onPinMouseUp.bind(this),
                setChipState:this.setChipState.bind(this),
                getChipState:this.getChipState.bind(this),
              }} />
            </div>
          )}
          {this.state.connections.map((c,i)=>
            <div key={i} className='ConnectionContainer' 
              style={{left:Math.min(c.src.x,c.dst.x)-5,top:Math.min(c.src.y,c.dst.y)-5}}>
              <ConnectionUI 
                index={i}
                hooks={{onMouseDown:this.onConnectionMouseDown.bind(this)}}
                lineType={this.getConnectionType(i)} 
                info={c}
              />
            </div>
          )}
          {this.state.drawLine !== undefined?
            <div className='ConnectionContainer'
            style={{left:Math.min(this.state.drawLine.src.x,this.state.drawLine.dst.x)-5,top:Math.min(this.state.drawLine.src.y,this.state.drawLine.dst.y)-5}}>
              <ConnectionUI info={this.state.drawLine}/>
            </div>
          :<div/>}
        </div>
        <div className='Menu'>
          <button className='MenuButton' disabled={this.state.simulationActive} onClick={this.onAddChipButtonClick.bind(this)}>Add Chip</button>
          <button className='MenuButton' onClick={this.onSimulateButtonClick.bind(this)}>{this.state.simulationActive?'Edit':'Simulate'}</button>
          <button className='MenuButton' disabled={!this.state.simulationActive} onClick={this.onUpdateButtonClick.bind(this)}>Update</button>
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
