import { Renderer } from './Renderer' 
import { Agent, Farmer, Lumberjack, Miner } from './Agent'
import { AuctionHouse } from './AuctionHouse';

export function average(a: number, b: number) {
  return (a + b) / 2
}

function randomBetween(a: number, b: number) {
  const difference = b - a
  return a + Math.random() * difference
}

export function clamp(t: number, a: number, b: number) {
  if (t < a) {
    return a
  } else if (t > b) {
    return b
  }
  return t
}

export function makeId() {
  let id = ""
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  for (let i = 0; i < 3; i++) {
    id += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return id
}

export class World {
  renderer: Renderer

  tickCount: number = 0
  reserveBank: number = 50000
  agents: Agent[] = []
  auctionHouse: AuctionHouse

  agentTypeCount: any = {}
  totalCurrency: any = {}
  
  constructor() {
    this.auctionHouse = new AuctionHouse(this)
    this.renderer = new Renderer(this)
    this.initUI()

    // First tick
    this.tickPopulation
    this.auctionHouse.tickMarket()
    this.tickWorld()
  }

  tick() {
    this.tickCount++
    this.tickPopulation()
    this.agents.forEach(agent => agent.tickFavorability())
    this.agents.forEach(agent => agent.tickProduction())
    this.agents.forEach(agent => agent.tickOffers())
    this.agents.forEach(agent => agent.tickTax())
    this.agents.forEach(agent => agent.tickLifecycle())
    this.auctionHouse.tickMarket()
    this.tickWorld()
    this.renderer.tick()
  }

  tickPopulation() {
    if (this.tickCount <= 20) {
      this.agents.unshift(new PROFESSION_CONSTRUCTOR[Math.floor(Math.random() * PROFESSION_CONSTRUCTOR.length)](this))
    }
  }

  tickWorld() {
    for (const profession of PROFESSIONS) {
      this.agentTypeCount[profession] = this.agents.filter(agent => agent.type === profession).length
      this.totalCurrency[profession] = this.agents.filter(agent => agent.type === profession).reduce((acc, agent) => acc + agent.currency, 0)
    }
  }

  // updateUI() {
  //   const infoElement: HTMLElement = document.getElementById("info")
  //   infoElement.innerHTML = `
  //   <table>
  //     <tr>
  //       <th>Commodity</th>
  //       <th>Bank</th>
  //       <th>Agents</th>
  //       <th>Farmers</th>
  //       <th>Lumberjacks</th>
  //       <th>Miners</th>
  //     </tr>
  //     <tr>
  //       <td>Currency</td>
  //       <td>${this.reserveBank.toFixed(0)}</td>
  //       <td>${this.agents.reduce((acc, agent) => acc + agent.currency, 0).toFixed(0)}</td>
  //       <td>${(this.totalCurrency["farmer"] / this.agentTypeCount["farmer"]).toFixed(0)}</td>
  //       <td>${(this.totalCurrency["lumberjack"] / this.agentTypeCount["lumberjack"]).toFixed(0)}</td>
  //       <td>${(this.totalCurrency["miner"] / this.agentTypeCount["miner"]).toFixed(0)}</td>
  //     </tr>
  //     <tr>
  //       <td>Food</td>
  //       <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["food"], 0).toFixed(0)}</td>
  //     </tr>
  //     <tr>
  //       <td>Wood</td>
  //       <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["wood"], 0).toFixed(0)}</td>
  //     </tr>
  //     <tr>
  //       <td>Iron</td>
  //       <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["iron"], 0).toFixed(0)}</td>
  //     </tr>
  //   </table>
  //   <table>
  //     <tr>
  //       <th>Agent</th>
  //       <th>Currency</th>
  //       <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
  //       <th>Food</th>
  //       <th>Desired</th>
  //       <th>Low</th>
  //       <th>High</th>
  //       <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
  //       <th>Wood</th>
  //       <th>Desired</th>
  //       <th>Low</th>
  //       <th>High</th>
  //       <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
  //       <th>Iron</th>
  //       <th>Desired</th>
  //       <th>Low</th>
  //       <th>High</th>
  //     </tr>
  //     ${this.agents.sort((a, b) => a.type.toUpperCase() < b.type.toUpperCase() ? -1 : 1).map(agent => `<tr>
  //     <td>${agent.type}</td>
  //     <td>${agent.currency.toFixed(1)}</td>
  //     <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
  //     <td>${agent.inventory["food"].toFixed(1)}</td>
  //     <td>${agent.desired["food"].toFixed(1)}</td>
  //     <td>${agent.askPriceLow["food"].toFixed(1)}</td>
  //     <td>${agent.askPriceHigh["food"].toFixed(1)}</td>
  //     <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
  //     <td>${agent.inventory["wood"].toFixed(1)}</td>
  //     <td>${agent.desired["wood"].toFixed(1)}</td>
  //     <td>${agent.askPriceLow["wood"].toFixed(1)}</td>
  //     <td>${agent.askPriceHigh["wood"].toFixed(1)}</td>
  //     <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
  //     <td>${agent.inventory["iron"].toFixed(1)}</td>
  //     <td>${agent.desired["iron"].toFixed(1)}</td>
  //     <td>${agent.askPriceLow["iron"].toFixed(1)}</td>
  //     <td>${agent.askPriceHigh["iron"].toFixed(1)}</td>
  //     </tr>`).join(" ")}
  //   </table>
  //   <h4>Bids</h4>
  //   ${COMMODITIES.map(commodity => `${`<ul>
  //     ${this.auctionHouse.bids[commodity].map(bid => `<li>${bid.agent.type} Bid ${bid.commodity + " - " + bid.price.toFixed(3) + " - " + bid.count}</li>`).join(" ")}
  //   </ul>`}`).join(" ")}
  //   <h4>Asks</h4>
  //   ${COMMODITIES.map(commodity => `${`<ul>
  //     ${this.auctionHouse.asks[commodity].map(ask => `<li>${ask.agent.type} Ask ${ask.commodity + " - " + ask.price.toFixed(3) + " - " + ask.count}</li>`).join(" ")}
  //   </ul>`}`).join(" ")}
  //   `
  // }

  initUI() {
    const mainElement: HTMLElement = document.getElementById("main")
    mainElement.innerHTML = `
    <button id="button_step" style="background-color: lightblue; width: 200px; height: 40px;">Step</button>
    `
    document.getElementById("button_step").addEventListener("click", (e:Event) => this.tick())
  }
}

export class Commodities {
  constructor() {
    for (const commodity of COMMODITIES) {
      this[commodity] = 0
    }
  }
}

export const COMMODITIES = ["food", "wood", "iron"]
export const PROFESSIONS = ["farmer", "lumberjack", "miner"]
export const PROFESSION_CONSTRUCTOR = [Farmer, Lumberjack, Miner]

export type Commodity = "food" | "wood" | "iron"

const world: World = new World()