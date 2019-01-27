import { World, COMMODITIES, clamp, makeId, average } from './index'
import { Offer } from './AuctionHouse'

// TODO: Add agent opinions in plain text

export class Agent {
  world: World
  id: string
  type: string

  age: number
  
  currency: number = 0
  
  inventoryCurrent: any = {}
  inventoryTarget: any = {}
  opinionPrice: any = {}
  favorability: any = {}

  bidFavorabilityMultiplier: any = {}
  askDemandMultiplier: any = {}

  profitFactor: number = 0
  inventoryFactor: any = {}
  marketFactor: any = {}
  
  bidProfessionCommodities: string[] = []
  askProfessionCommodities: string[] = []
  boostProfessionCommodities: string[] = []

  constructor(world: World) {
    this.world = world
    this.id = makeId()
    this.age = 0
    for (const commodity of COMMODITIES) {
      this.inventoryCurrent[commodity] = 0
      this.inventoryTarget[commodity] = 0
      this.opinionPrice[commodity] = this.world.auctionHouse.marketAveragePrice[commodity]
      this.favorability[commodity] = 0
      
      this.bidFavorabilityMultiplier[commodity] = 0
      this.askDemandMultiplier[commodity] = 0

      this.inventoryFactor[commodity] = 0
      this.marketFactor[commodity] = 0
    }
  }
  postConstructor() {
    this.world.reserveBank -= this.currency
    this.bidProfessionCommodities.forEach(bidCommodity => this.inventoryTarget[bidCommodity] = 10)
    this.boostProfessionCommodities.forEach(boostCommodity => this.inventoryTarget[boostCommodity] = 5)
    console.log(`A ${this.type} by the name of ${this.id} entered the market`)
  }
  tickFavorability() {
    // Profit factor - How many times the expense would the profit be given the current market prices
    const bidCommoditiesPrice = this.bidProfessionCommodities.reduce((totalPrice, commodity) => totalPrice + this.world.auctionHouse.marketAverageBid[commodity], 0)
    const askCommoditiesPrice = this.askProfessionCommodities.reduce((totalPrice, commodity) => totalPrice + this.world.auctionHouse.marketAverageAsk[commodity], 0)
    const profitFactor = clamp(askCommoditiesPrice != 0 ? (askCommoditiesPrice - bidCommoditiesPrice) / askCommoditiesPrice : 0, -1.5, 1.5)
    this.profitFactor = profitFactor

    for (const commodity of COMMODITIES) {
      
      // 1 when we have none in inventory, 0 when we have ideal, -1 when we have double or more in inventory 
      const inventoryFactor = (this.inventoryTarget[commodity] - this.inventoryCurrent[commodity])
      this.inventoryFactor[commodity] = inventoryFactor

      // Balance of opinionPrice to marketPrice: -1 when marketPrice is double, 0 when same, 1 when marketPrice is 0
      const marketFactor = (this.opinionPrice[commodity] != 0 ? (this.opinionPrice[commodity] - this.world.auctionHouse.marketAveragePrice[commodity]) / this.opinionPrice[commodity] : -100) * 1.5
      this.marketFactor[commodity] = marketFactor

      const isProfessionCommodity = this.bidProfessionCommodities.indexOf(commodity) != -1
      this.favorability[commodity] = ((isProfessionCommodity ? profitFactor : 0) + inventoryFactor + marketFactor) / 3
      
      this.bidFavorabilityMultiplier[commodity] = ((this.favorability[commodity] - 1) / 4) + 1

      const demand = this.world.auctionHouse.marketDemand[commodity]
      const demandFactor = Math.log(Math.abs(demand / 4000) + 1) * (demand / Math.abs(demand))
      this.askDemandMultiplier[commodity] = demandFactor + 1

    }
  }
  tickProduction() {
    if (Math.random() < 0.5) {
      const hasRawCommodities = this.bidProfessionCommodities.every(commodity => this.inventoryCurrent[commodity] >= 1)
      const hasBoostCommodities = this.boostProfessionCommodities.length > 0 && this.boostProfessionCommodities.every(commodity => this.inventoryCurrent[commodity] >= 0.5)
      const hasTooMuchProduct = this.askProfessionCommodities.some(commodity => this.inventoryCurrent[commodity] >= 50)

      if (!hasRawCommodities || hasTooMuchProduct) {
        this.currency -= 2
        this.world.reserveBank += 2
        return
      }

      if (hasBoostCommodities) {
        this.bidProfessionCommodities.forEach(bidCommodity => this.inventoryCurrent[bidCommodity] -= 1)
        this.boostProfessionCommodities.forEach(boostCommodity => this.inventoryCurrent[boostCommodity] -= 0.5)
        this.askProfessionCommodities.forEach(askCommodity => this.inventoryCurrent[askCommodity] += 1.6)
      } else {
        this.bidProfessionCommodities.forEach(bidCommodity => this.inventoryCurrent[bidCommodity] -= 1)
        this.askProfessionCommodities.forEach(askCommodity => this.inventoryCurrent[askCommodity] += 0.8)
      }
    }
  }
  tickOffers() {
    if (Math.random() < 0.5) {
      const bid = commodity => {
        const price = average(this.opinionPrice[commodity], this.world.auctionHouse.marketAverageBid[commodity]) * this.bidFavorabilityMultiplier[commodity]
        const count = this.favorability[commodity] * 4

        this.world.auctionHouse.bid(this, commodity, price, count)
      }
      const ask = commodity => {
        const price = average(this.opinionPrice[commodity], this.world.auctionHouse.marketAverageAsk[commodity]) * this.askDemandMultiplier[commodity]
        const count = -this.favorability[commodity] * 4

        this.world.auctionHouse.ask(this, commodity, price, count)
      }

      COMMODITIES.forEach(commodity => {
        if (this.favorability[commodity] > 0.001) {
          bid(commodity)
        } else if (this.favorability[commodity] < -0.001) {
          ask(commodity)
        }
      })
    }
  }
  tickTax() {
    // this.currency -= 2
    // this.world.reserveBank += 2
  }
  tickLifecycle() {
    this.age++
    // this.currency += 1
  }
  resolveOffer(offer: Offer) {
    const acceptedBid = () => {
      // Bid less
      this.opinionPrice[offer.commodity] = average(this.opinionPrice[offer.commodity] * 0.97 + (Math.random() / 100) * 4, offer.clearingPrice)
    }
    const acceptedAsk = () => {
      // Ask more
      this.opinionPrice[offer.commodity] = average(this.opinionPrice[offer.commodity] * 0.99 + (Math.random() / 100) * 4, offer.clearingPrice)
    }
    const rejectedBid = () => {
      // Bid more
      this.opinionPrice[offer.commodity] = this.opinionPrice[offer.commodity] * 0.95 + (Math.random() / 100) * 20
    }
    const rejectedAsk = () => {
      // Ask less
      this.opinionPrice[offer.commodity] = this.opinionPrice[offer.commodity] * 0.85 + (Math.random() / 100) * 20
    }

    if (offer.status === "accepted") {
      if (offer.type === "bid") {
        acceptedBid()
      } else {
        acceptedAsk()
      }
    } else {
      if (offer.type === "bid") {
        rejectedBid()
      } else {
        rejectedAsk()
      }
    }
  }
}

export class Farmer extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "farmer"
    this.currency = 200
    this.boostProfessionCommodities = ["wood", "tools"]
    this.askProfessionCommodities = ["food"]
    this.postConstructor()
  }
}

export class Lumberjack extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "lumberjack"
    this.currency = 200
    this.bidProfessionCommodities = ["food"]
    this.boostProfessionCommodities = ["iron", "tools"]
    this.askProfessionCommodities = ["wood"]
    this.postConstructor()
  }
}

export class Miner extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "miner"
    this.currency = 200
    this.bidProfessionCommodities = ["food", "wood"]
    this.boostProfessionCommodities = ["tools"]
    this.askProfessionCommodities = ["iron"]
    this.postConstructor()
  }
}

export class Blacksmith extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "blacksmith"
    this.currency = 200
    this.bidProfessionCommodities = ["food", "iron"]
    this.boostProfessionCommodities = ["wood"]    
    this.askProfessionCommodities = ["tools"]
    this.postConstructor()
  }
}