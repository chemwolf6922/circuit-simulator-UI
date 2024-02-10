import React from 'react';
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
  renderCustomBody(): React.ReactNode {
    return <div></div>;
  }
  onBodyMouseDown(e:React.MouseEvent){
    e.preventDefault();
    e.stopPropagation();
    this.props.hooks.onChipMouseDown(this.props.id,e);
  }
  render(): React.ReactNode {
    return (
      <div className='Chip'>
        <div className='ChipInputs'>
          {this.props.info.inputPins.map((pin,i)=>
            <div className='ChipInput' key={`${i}`}>{pin}</div>
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
          {this.props.info.outputPins.map((pin,i)=>
            <div className='ChipOutput' key={`${i}`}>{pin}</div>
          )}
        </div>
      </div>
    );
  }
}

// class ConnectionUI extends React.Component {

// }

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
      chip:Chip;
    }};
    connections:Array<{
      chipA:string;
      pinA:string;
      chipB:string;
      pinB:string;
    }>;
  } = {
    canvasPosition:{x:0,y:0},
    chips:{
      'source':{
        position:{x:100,y:100},
        chip:new CHIPS.ChipSource()
      },
      'U1':{
        position:{x:200,y:200},
        chip:new CHIPS.Chip7400(),
      }
    },
    connections:[]
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
      /** @todo move the screen */
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
  }
  render() {
    return (
      <div className="App">
        <div className='Canvas' style={{left:this.state.canvasPosition.x,top:this.state.canvasPosition.y}}>
          {Object.entries(this.state.chips).map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUI {...{id:n,info:c.chip.info,hooks:{
                onChipMouseDown:this.onChipMouseDown.bind(this)
              }}} />
            </div>
          )}
          {/* @todo use a div to stretch the drawing area (to extend the size when the user moves the window) */}
        </div>
      </div>
    );
  }
}

export default App;
