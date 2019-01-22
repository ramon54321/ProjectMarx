import * as Smoothie from 'smoothie'
import { Renderer } from './renderer' 

function average(a: number, b: number) {
  return (a + b) / 2
}

function randomBetween(a: number, b: number) {
  const difference = b - a
  return a + Math.random() * difference
}

class Agent {
  type: string
  currency: number = 0
  bidCommodities: string[] = []
  askCommodities: string[] = []
  inventory: any = {}
  ideal: any = {}
  desired: any = {}
  bidPriceLow: any = {}
  bidPriceHigh: any = {}
  askPriceLow: any = {}
  askPriceHigh: any = {}

  constructor(auctionHouse: AuctionHouse) {
    for (const commodity of COMMODITIES) {
      this.inventory[commodity] = 0
      this.ideal[commodity] = 0
      this.desired[commodity] = 0

      this.bidPriceLow[commodity] = auctionHouse.marketAverageBid[commodity] ? auctionHouse.marketAverageBid[commodity] * 0.99 : 0.99
      this.bidPriceHigh[commodity] = auctionHouse.marketAverageBid[commodity] ? auctionHouse.marketAverageBid[commodity] * 1.01 : 1.01
      this.askPriceLow[commodity] = auctionHouse.marketAverageAsk[commodity] ? auctionHouse.marketAverageAsk[commodity] * 0.99 : 0.99
      this.askPriceHigh[commodity] = auctionHouse.marketAverageAsk[commodity] ? auctionHouse.marketAverageAsk[commodity] * 1.01 : 1.01
    }
  }
  initCommodities() {
    for (const commodity of this.bidCommodities) {
      this.inventory[commodity] = 0
    }
  }
  postConstructor() {
    console.log(`A ${this.type} entered the market`)
  }
  tickTax(world: World) {
    this.currency -= 2
    world.reserveBank += 2
  }
  produce(world: World) {
    const hasResources = this.bidCommodities.map(commodity => this.inventory[commodity] >= 1).indexOf(false) == -1
    if (hasResources) {
      for (const commodity of this.bidCommodities) {
        this.inventory[commodity] -= 1
      }
      for (const commodity of this.askCommodities) {
        this.inventory[commodity] += 1
      }
    } else {
      this.currency -= 2
      world.reserveBank += 2
    }
  }
  calculateDesired(auctionHouse: AuctionHouse) {
    for (const commodity of this.bidCommodities) {
      const currentAmount = this.inventory[commodity]
      const idealAmount = this.ideal[commodity]
      const difference = idealAmount - currentAmount
      if (difference <= 0) {
        this.desired[commodity] = 0
        continue
      }
      
      // Calculate how good the market is relative to this agents opinion
      let favourability = 0
      const marketPrice = auctionHouse.marketAverageAsk[commodity]
      if (marketPrice < this.bidPriceHigh[commodity] && marketPrice > this.bidPriceLow[commodity]) {
        // Expected range
        favourability = 0.65
      } else if (marketPrice < this.bidPriceLow[commodity]) {
        // Market price is low -> Buy More
        favourability = 1
      } else if (marketPrice > this.bidPriceHigh[commodity]) {
        // Market price is high -> Buy Less
        favourability = 0.25
      }
      
      this.desired[commodity] = difference * favourability
    }

    for (const commodity of this.askCommodities) {
      const currentAmount = this.inventory[commodity]
      const idealAmount = this.ideal[commodity]
      const difference = idealAmount - currentAmount

      if (difference >= 0) {
        this.desired[commodity] = 0
        continue
      }

      // Calculate how good the market is relative to this agents opinion
      let favourability = 0
      const marketPrice = auctionHouse.marketAverageAsk[commodity]
      if (marketPrice < this.bidPriceHigh[commodity] && marketPrice > this.bidPriceLow[commodity]) {
        // Expected range
        favourability = 0.65
      } else if (marketPrice < this.bidPriceLow[commodity]) {
        // Market price is low -> Sell Less
        favourability = 0.25
      } else if (marketPrice > this.bidPriceHigh[commodity]) {
        // Market price is high -> Sell More
        favourability = 1
      }

      this.desired[commodity] = difference * favourability
    }
  }
  placeOffers(auctionHouse: AuctionHouse) {
    for (const commodity of this.bidCommodities) {
      const bidCountDesire = this.desired[commodity]
      if (bidCountDesire == 0) {
        continue
      }
      const bidPrice = randomBetween(this.bidPriceLow[commodity], this.bidPriceHigh[commodity])
      const bidCountAfford = Math.floor(this.currency / bidPrice)
      const bidCount = Math.min(bidCountDesire, bidCountAfford)
      if (bidCount > 0) {
        auctionHouse.bid(this, commodity, bidPrice, bidCount)
      }
    }
    for (const commodity of this.askCommodities) {
      const askCountDesire = this.desired[commodity]
      if (askCountDesire < 0) {
        auctionHouse.ask(this, commodity, randomBetween(this.askPriceLow[commodity], this.askPriceHigh[commodity]), -askCountDesire)
      }
    }
  }
  accept(offerResolution: OfferResolution) {
    if (offerResolution.offer.direction == OfferDirection.Bid) {
      for (const commodity of this.bidCommodities) {
        if (offerResolution.offer.commodity == commodity) {
          if (offerResolution.clearingPrice < this.bidPriceLow[commodity]) {
            this.bidPriceLow[commodity] = offerResolution.clearingPrice
          } else {
            this.bidPriceLow[commodity] = average(this.bidPriceLow[commodity], offerResolution.clearingPrice)
          }
          if (offerResolution.clearingPrice > this.bidPriceHigh[commodity]) {
            this.bidPriceHigh[commodity] = offerResolution.clearingPrice
          } else {
            this.bidPriceHigh[commodity] = average(this.bidPriceHigh[commodity], offerResolution.clearingPrice)
          }
        }
      }
    } else {
      for (const commodity of this.askCommodities) {
        if (offerResolution.offer.commodity == commodity) {
          if (offerResolution.clearingPrice < this.askPriceLow[commodity]) {
            this.askPriceLow[commodity] *= 1.05 - Math.random() / 4
          } else {
            this.askPriceLow[commodity] *= 0.95 + Math.random() / 4
          }
          if (offerResolution.clearingPrice > this.askPriceHigh[commodity]) {
            this.askPriceHigh[commodity] *= 0.95 + Math.random() / 4
          } else {
            this.askPriceHigh[commodity] *= 1.05 - Math.random() / 4
          }
        }
      }
    }
  }
  reject(offer: Offer) {
    if (offer.direction == OfferDirection.Bid) {
      this.bidPriceLow[offer.commodity] *= 0.95 + Math.random() / 4
      this.bidPriceHigh[offer.commodity] *= 0.95 + Math.random() / 4
    } else {
      this.askPriceLow[offer.commodity] *= 1.05 - Math.random() / 4
      this.askPriceHigh[offer.commodity] *= 1.05 - Math.random() / 4
    }
  }
}

class farmer extends Agent {
  constructor(auctionHouse: AuctionHouse) {
    super(auctionHouse)
    this.type = "farmer"
    this.currency = 1500
    auctionHouse.world.reserveBank -= 1500
    this.ideal["wood"] = 10
    this.ideal["iron"] = 5
    this.ideal["food"] = 0
    this.bidCommodities = ["wood", "iron"]
    this.askCommodities = ["food"]
    this.initCommodities()
    this.postConstructor()
  }
  produce(world: World) {
    if (this.inventory["wood"] >= 2 && this.inventory["iron"] >= 1) {
      this.inventory["wood"] -= 2
      this.inventory["iron"] -= Math.random() <= 0.1 ? 1 : 0
      this.inventory["food"] += 8
    } else if (this.inventory["wood"] >= 1) {
      this.inventory["wood"] -= 1
      this.inventory["food"] += 4
    } else {
      this.inventory["food"] += 0.5
    }
  }
}

class lumberjack extends Agent {
  constructor(auctionHouse: AuctionHouse) {
    super(auctionHouse)
    this.type = "lumberjack"
    this.currency = 2000
    auctionHouse.world.reserveBank -= 2000
    this.ideal["food"] = 10
    this.ideal["iron"] = 8
    this.ideal["wood"] = 0
    this.bidCommodities = ["food"]
    this.askCommodities = ["wood"]
    this.initCommodities()
    this.postConstructor()
  }
  produce(world: World) {
    if (this.inventory["food"] >= 2 && this.inventory["iron"] >= 2) {
      this.inventory["food"] -= 2
      this.inventory["iron"] -= Math.random() <= 0.25 ? 2 : 0
      this.inventory["wood"] += 2
    } else if (this.inventory["food"] >= 1) {
      this.inventory["food"] -= 1
      this.inventory["wood"] += 1
    } else {
      this.inventory["wood"] += 0.1
    }
  }
}

class miner extends Agent {
  constructor(auctionHouse: AuctionHouse) {
    super(auctionHouse)
    this.type = "miner"
    this.currency = 5000
    auctionHouse.world.reserveBank -= 5000
    this.ideal["food"] = 24
    this.ideal["wood"] = 18
    this.ideal["iron"] = 0
    this.bidCommodities = ["food", "wood"]
    this.askCommodities = ["iron"]
    this.initCommodities()
    this.postConstructor()
  }
  produce(world: World) {
    if (this.inventory["food"] >= 5 && this.inventory["wood"] >= 5) {
      this.inventory["food"] -= 5
      this.inventory["wood"] -= Math.random() <= 0.65 ? 5 : 4
      this.inventory["iron"] += 1.5
    } else if (this.inventory["food"] >= 7) {
      this.inventory["food"] -= 7
      this.inventory["iron"] += 1
    } else {
      this.inventory["iron"] += 0.01
    }
  }
}

enum OfferDirection {
  Bid,
  Ask,
}

interface Offer {
  agent: Agent,
  direction: OfferDirection,
  commodity: string,
  price: number,
  count: number,
  matchAttempts?: number,
}

interface OfferResolution {
  offer: Offer,
  clearingPrice: number,
  count: number,
}

export class AuctionHouse {
  world: World
  bids: any = {}
  asks: any = {}
  marketAverageBid: Commodities
  marketAverageAsk: Commodities

  constructor(world: World) {
    this.world = world
    this.marketAverageBid = new Commodities()
    this.marketAverageAsk = new Commodities()
    for (const commodity of COMMODITIES) {
      this.bids[commodity] = []
      this.asks[commodity] = []
      this.marketAverageBid[commodity] = 0.5
      this.marketAverageAsk[commodity] = 1.5
    }
  }

  bid(agent: Agent, commodity: string, price: number, atMost: number) {
    this.bids[commodity].push({
      agent,
      direction: OfferDirection.Bid,
      commodity,
      price,
      count: atMost,
    })
  }

  ask(agent: Agent, commodity: string, price: number, atLeast: number) {
    this.asks[commodity].push({
      agent,
      direction: OfferDirection.Ask,
      commodity,
      price,
      count: atLeast,
    })
  }

  calculateMarketAverages() {
    for (const commodity of COMMODITIES) {
      if (this.bids[commodity].length > 0) {
        this.marketAverageBid[commodity] = this.bids[commodity].reduce((acc, offer) => acc + offer.price, 0) / this.bids[commodity].length
      }
      if (this.asks[commodity].length > 0) {
        this.marketAverageAsk[commodity] = this.asks[commodity].reduce((acc, offer) => acc + offer.price, 0) / this.asks[commodity].length
      }
    }
  }

  resolveOffers() {
    // Sort bids from highest to lowest price
    this.bids.food.sort((a, b) => b.price - a.price)
    this.bids.wood.sort((a, b) => b.price - a.price)
    this.bids.iron.sort((a, b) => b.price - a.price)
    // Sort asks from lowest to highest price
    this.asks.food.sort((a, b) => a.price - b.price)
    this.asks.wood.sort((a, b) => a.price - b.price)
    this.asks.iron.sort((a, b) => a.price - b.price)

    // Track accepted offers
    const acceptedOfferResolutions: OfferResolution[] = []
    for (const commodity of COMMODITIES) {
      while (this.bids[commodity].length != 0 && this.asks[commodity].length != 0) {
        const bid = this.bids[commodity][0]
        const ask = this.asks[commodity][0]
        const count = Math.min(bid.count, ask.count)
        const price = average(bid.price, ask.price)

        // if (price * count < bid.agent.currency) {
        //   const bid = this.bids[commodity].shift()
        //   bid.agent.reject(bid)
        //   continue
        // }

        if (count > 0) {
          bid.count -= count
          ask.count -= count
          ask.agent.inventory[ask.commodity] -= count
          bid.agent.inventory[bid.commodity] += count
          bid.agent.currency -= count * price
          ask.agent.currency += count * price
          acceptedOfferResolutions.push({
            offer: bid,
            clearingPrice: price,
            count,
          })
          acceptedOfferResolutions.push({
            offer: ask,
            clearingPrice: price,
            count
          })
        }
  
        if (bid.count == 0) {
          this.bids[commodity].shift()
        }
  
        if (ask.count == 0) {
          this.asks[commodity].shift()
        }
      }
  
      acceptedOfferResolutions.forEach(offerResolution => offerResolution.offer.agent.accept(offerResolution))
  
      // Reject remaining
      if (this.bids[commodity].length > 0 && this.asks[commodity].length > 0) {
        console.log("Both books non-empty")
      }
      
      while (this.bids[commodity].length > 0) {
        const bid = this.bids[commodity].shift()
        bid.agent.reject(bid)
      }
  
      while (this.asks[commodity].length > 0) {
        const ask = this.asks[commodity].shift()
        ask.agent.reject(ask)
      }
  
      if (this.bids[commodity].length > 0 || this.asks[commodity].length > 0) {
        console.log("Books not empty after rejections")
      }
    }
  }
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
  }

  tick() {
    this.tickCount++
    this.spawn()
    this.agents.forEach(agent => agent.produce(this))
    this.agents.forEach(agent => agent.calculateDesired(this.auctionHouse))
    this.agents.forEach(agent => agent.placeOffers(this.auctionHouse))
    this.auctionHouse.calculateMarketAverages()
    this.calculateMarketData()
    this.renderer.tick()
    this.updateUI()
    this.updateCharts()
    this.auctionHouse.resolveOffers()
    this.agents.forEach(agent => agent.tickTax(this))
    this.agents.forEach(agent => {
      if (agent.currency <= 0) {
        const index = this.agents.indexOf(agent);
        if (index > -1) {
          this.agents.splice(index, 1)
          // const professionString = PROFESSIONS_STRING.reduce((best, proStr) => {
          //   const avgCurrency = this.totalCurrency[proStr] / this.agentTypeCount[proStr]
          //   if (avgCurrency > best.currency) {
          //     return {
          //       currency: avgCurrency,
          //       proStr
          //     }
          //   } else {
          //     return best
          //   }
          // }, {
          //   currency: 0,
          //   proStr: ""
          // }).proStr
          // if (Math.random() < 0.5) {
          //   this.agents.unshift(new PROFESSIONS[PROFESSIONS_STRING.indexOf(professionString)](this.auctionHouse))
          // }
          this.agents.unshift(new PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)](this.auctionHouse))
        } else {
          console.log("Cant find agent in list")
        }
      }
    })
  }

  spawn() {
    if (this.tickCount <= 20) {
      this.agents.unshift(new PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)](this.auctionHouse))
    }
  }

  calculateMarketData() {
    this.agentTypeCount["farmer"] = this.agents.filter(agent => agent.type === "farmer").length
    this.agentTypeCount["lumberjack"] = this.agents.filter(agent => agent.type === "lumberjack").length
    this.agentTypeCount["miner"] = this.agents.filter(agent => agent.type === "miner").length
    this.totalCurrency["farmer"] = this.agents.filter(agent => agent.type === "farmer").reduce((acc, agent) => acc + agent.currency, 0)
    this.totalCurrency["lumberjack"] = this.agents.filter(agent => agent.type === "lumberjack").reduce((acc, agent) => acc + agent.currency, 0)
    this.totalCurrency["miner"] = this.agents.filter(agent => agent.type === "miner").reduce((acc, agent) => acc + agent.currency, 0)
  }

  updateUI() {
    const infoElement: HTMLElement = document.getElementById("info")
    infoElement.innerHTML = `
    <table>
      <tr>
        <th>Commodity</th>
        <th>Bank</th>
        <th>Agents</th>
        <th>Farmers</th>
        <th>Lumberjacks</th>
        <th>Miners</th>
      </tr>
      <tr>
        <td>Currency</td>
        <td>${this.reserveBank.toFixed(0)}</td>
        <td>${this.agents.reduce((acc, agent) => acc + agent.currency, 0).toFixed(0)}</td>
        <td>${(this.totalCurrency["farmer"] / this.agentTypeCount["farmer"]).toFixed(0)}</td>
        <td>${(this.totalCurrency["lumberjack"] / this.agentTypeCount["lumberjack"]).toFixed(0)}</td>
        <td>${(this.totalCurrency["miner"] / this.agentTypeCount["miner"]).toFixed(0)}</td>
      </tr>
      <tr>
        <td>Food</td>
        <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["food"], 0).toFixed(0)}</td>
      </tr>
      <tr>
        <td>Wood</td>
        <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["wood"], 0).toFixed(0)}</td>
      </tr>
      <tr>
        <td>Iron</td>
        <td>${this.agents.reduce((acc, agent) => acc + agent.inventory["iron"], 0).toFixed(0)}</td>
      </tr>
    </table>
    <table>
      <tr>
        <th>Agent</th>
        <th>Currency</th>
        <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th>Food</th>
        <th>Desired</th>
        <th>Low</th>
        <th>High</th>
        <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th>Wood</th>
        <th>Desired</th>
        <th>Low</th>
        <th>High</th>
        <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th>Iron</th>
        <th>Desired</th>
        <th>Low</th>
        <th>High</th>
      </tr>
      ${this.agents.sort((a, b) => a.type.toUpperCase() < b.type.toUpperCase() ? -1 : 1).map(agent => `<tr>
      <td>${agent.type}</td>
      <td>${agent.currency.toFixed(1)}</td>
      <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
      <td>${agent.inventory["food"].toFixed(1)}</td>
      <td>${agent.desired["food"].toFixed(1)}</td>
      <td>${agent.askPriceLow["food"].toFixed(1)}</td>
      <td>${agent.askPriceHigh["food"].toFixed(1)}</td>
      <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
      <td>${agent.inventory["wood"].toFixed(1)}</td>
      <td>${agent.desired["wood"].toFixed(1)}</td>
      <td>${agent.askPriceLow["wood"].toFixed(1)}</td>
      <td>${agent.askPriceHigh["wood"].toFixed(1)}</td>
      <td>&nbsp;&nbsp;&nbsp;&nbsp;</td>
      <td>${agent.inventory["iron"].toFixed(1)}</td>
      <td>${agent.desired["iron"].toFixed(1)}</td>
      <td>${agent.askPriceLow["iron"].toFixed(1)}</td>
      <td>${agent.askPriceHigh["iron"].toFixed(1)}</td>
      </tr>`).join(" ")}
    </table>
    <h4>Bids</h4>
    ${COMMODITIES.map(commodity => `${`<ul>
      ${this.auctionHouse.bids[commodity].map(bid => `<li>${bid.agent.type} Bid ${bid.commodity + " - " + bid.price.toFixed(3) + " - " + bid.count}</li>`).join(" ")}
    </ul>`}`).join(" ")}
    <h4>Asks</h4>
    ${COMMODITIES.map(commodity => `${`<ul>
      ${this.auctionHouse.asks[commodity].map(ask => `<li>${ask.agent.type} Ask ${ask.commodity + " - " + ask.price.toFixed(3) + " - " + ask.count}</li>`).join(" ")}
    </ul>`}`).join(" ")}
    `
  }

  initUI() {
    const mainElement: HTMLElement = document.getElementById("main")
    mainElement.innerHTML = `
    <button id="button_step" style="background-color: lightblue; width: 200px; height: 40px;">Step</button>
    `
    document.getElementById("button_step").addEventListener("click", (e:Event) => this.tick())
  }

  updateCharts() {
    // timeSeriesAsksFood.append(Date.now(), this.auctionHouse.marketAverageAsk["food"])
    // timeSeriesAsksWood.append(Date.now(), this.auctionHouse.marketAverageAsk["wood"])
    // timeSeriesAsksIron.append(Date.now(), this.auctionHouse.marketAverageAsk["iron"])
    // timeSeriesBidsFood.append(Date.now(), this.auctionHouse.marketAverageBid["food"])
    // timeSeriesBidsWood.append(Date.now(), this.auctionHouse.marketAverageBid["wood"])
    // timeSeriesBidsIron.append(Date.now(), this.auctionHouse.marketAverageBid["iron"])

  }
}

export class Commodities {
  constructor() {
    for (const commodity of COMMODITIES) {
      this[commodity] = 0
    }
  }
}

const TICK_DURATION = 250
export const COMMODITIES = ["food", "wood", "iron"]
export const PROFESSIONS = [farmer, lumberjack, miner]
export const PROFESSIONS_STRING = ["farmer", "lumberjack", "miner"]

// const timeSeriesAsksFood = new Smoothie.TimeSeries()
// const timeSeriesAsksWood = new Smoothie.TimeSeries()
// const timeSeriesAsksIron = new Smoothie.TimeSeries()
// const timeSeriesBidsFood = new Smoothie.TimeSeries()
// const timeSeriesBidsWood = new Smoothie.TimeSeries()
// const timeSeriesBidsIron = new Smoothie.TimeSeries()
// const chartBids = new Smoothie.SmoothieChart({grid:{fillStyle: '#313639', millisPerLine: 5000}, millisPerPixel: 100})
// const chartAsks = new Smoothie.SmoothieChart({grid:{fillStyle: '#313639', millisPerLine: 5000}, millisPerPixel: 100})
// chartBids.addTimeSeries(timeSeriesBidsFood,  {strokeStyle:'rgba(80,200,160, 0.5)', lineWidth: 2})
// chartBids.addTimeSeries(timeSeriesBidsWood, {strokeStyle:'rgba(190,170,110, 0.5)', lineWidth: 2})
// chartBids.addTimeSeries(timeSeriesBidsIron, {strokeStyle:'rgba(90,80,110, 0.5)', lineWidth: 2})
// chartAsks.addTimeSeries(timeSeriesAsksFood,  {strokeStyle:'rgb(80,200,160)', lineWidth: 2})
// chartAsks.addTimeSeries(timeSeriesAsksWood, {strokeStyle:'rgb(190,170,110)', lineWidth: 2})
// chartAsks.addTimeSeries(timeSeriesAsksIron, {strokeStyle:'rgb(90,80,110)', lineWidth: 2})
// chartBids.streamTo(document.getElementById("chartBids") as HTMLCanvasElement, TICK_DURATION)
// chartAsks.streamTo(document.getElementById("chartAsks") as HTMLCanvasElement, TICK_DURATION)

const world: World = new World()
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new miner(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new miner(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new farmer(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))
// world.agents.push(new lumberjack(world.auctionHouse))

// setInterval(() => world.tick(), TICK_DURATION)



// // Randomly add a data point every 500ms
// const random = new TimeSeries();
// setInterval(function() {
//   random.append(new Date().getTime(), Math.random() * 10000);
// }, 500);

// function createTimeline() {
//   const chart = new SmoothieChart();
//   chart.addTimeSeries(random, { strokeStyle: 'rgba(0, 255, 0, 1)', fillStyle: 'rgba(0, 255, 0, 0.2)', lineWidth: 4 });
//   chart.streamTo(document.getElementById("chart2"), 500);
// }
// createTimeline()