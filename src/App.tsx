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
  state:{
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
  onMouseUp(e:React.MouseEvent){
    if(this.#chipMoving){
      this.#chipMoving = false;
    }
  }
  onMouseMove(e:React.MouseEvent){
    if(this.#chipMoving){
      e.preventDefault();
      e.stopPropagation();
      const x = e.screenX-this.#chipMovingOffset.x;
      const y = e.screenY-this.#chipMovingOffset.y;
      console.log(x,y);
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
  }
  render() {
    return (
      <div className="App">
        <div className='DrawingArea' onMouseMove={this.onMouseMove.bind(this)} onMouseUp={this.onMouseUp.bind(this)}>
          {Object.entries(this.state.chips).map(([n,c])=>
            <div key={n} style={{left:c.position.x,top:c.position.y}} className='ChipContainer'>
              <ChipUI {...{id:n,info:c.chip.info,hooks:{
                onChipMouseDown:this.onChipMouseDown.bind(this)
              }}} />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;
