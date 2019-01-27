import { Renderer } from './Renderer' 
import { Agent, Farmer, Lumberjack, Miner, Blacksmith } from './Agent'
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
    this.auctionHouse.tickResolveOffers()
  }

  tickPopulation() {
    this.agents.forEach(agent => {
      if (agent.currency <= 0) {
        const index = this.agents.indexOf(agent)
        if (index != -1) {
          this.agents.splice(index, 1)
          this.agents.unshift(new PROFESSION_CONSTRUCTOR[Math.floor(Math.random() * PROFESSION_CONSTRUCTOR.length)](this))
        }
      }
    })
    if (this.tickCount <= 120) {
      this.agents.unshift(new PROFESSION_CONSTRUCTOR[Math.floor(Math.random() * PROFESSION_CONSTRUCTOR.length)](this))
    }
  }

  tickWorld() {
    for (const profession of PROFESSIONS) {
      this.agentTypeCount[profession] = this.agents.filter(agent => agent.type === profession).length
      this.totalCurrency[profession] = this.agents.filter(agent => agent.type === profession).reduce((acc, agent) => acc + agent.currency, 0)
    }
  }

  initUI() {
    const mainElement: HTMLElement = document.getElementById("main")
    mainElement.innerHTML = `
      <div class="fixed-box">
        <button onclick="window.tick()" class="button">Tick</button>
        <button onclick="window.startTick()" class="button">Start</button>
        <button onclick="window.stopTick()" class="button">Stop</button>
      </div>
    `
  }
}

export class Commodities {
  constructor() {
    for (const commodity of COMMODITIES) {
      this[commodity] = 0
    }
  }
}

export const COMMODITIES = ["food", "wood", "iron", "tools"]
export const PROFESSIONS = ["farmer", "lumberjack", "miner", "blacksmith"]
export const PROFESSION_CONSTRUCTOR = [Farmer, Lumberjack, Miner, Blacksmith]

export type Commodity = "food" | "wood" | "iron" | "tools"

const world: World = new World()
world.agents.push(new Farmer(world))
world.agents.push(new Farmer(world))
world.agents.push(new Farmer(world))
world.agents.push(new Farmer(world))
world.agents.push(new Farmer(world))
world.agents.push(new Lumberjack(world))

window["showInfo"] = (agentId: string) => {
  world.renderer.selectAgent(agentId)
}

window["tick"] = () => {
  world.tick()
}

let tickInterval = null
window["startTick"] = () => {
  if (!tickInterval) {
    tickInterval = setInterval(() => world.tick(), 100)
  }
}
window["stopTick"] = () => {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}