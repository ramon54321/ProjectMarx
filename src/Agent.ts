import { World, COMMODITIES, clamp, makeId } from './index'
import { Offer } from './AuctionHouse';

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
  
  bidProfessionCommodities: string[] = []
  askProfessionCommodities: string[] = []

  constructor(world: World) {
    this.world = world
    this.id = makeId()
    this.age = 0
    for (const commodity of COMMODITIES) {
      this.inventoryCurrent[commodity] = 0
      this.inventoryTarget[commodity] = 0
      this.opinionPrice[commodity] = 0
      this.favorability[commodity] = 0
    }
  }
  postConstructor() {
    console.log(`A ${this.type} by the name of ${this.id} entered the market`)
  }
  tickFavorability() {
    // Profit factor - How many times the expense would the profit be given the current market prices
    const bidCommoditiesPrice = this.bidProfessionCommodities.reduce((totalPrice, commodity) => totalPrice + this.world.auctionHouse.marketAverageBid[commodity], 0)
    const askCommoditiesPrice = this.askProfessionCommodities.reduce((totalPrice, commodity) => totalPrice + this.world.auctionHouse.marketAverageAsk[commodity], 0)
    const profitFactor = askCommoditiesPrice != 0 ? (askCommoditiesPrice - bidCommoditiesPrice) * 5 / askCommoditiesPrice : 0

    for (const commodity of COMMODITIES) {
      // 1 when we have none in inventory, 0 when we have ideal, -1 when we have double or more in inventory 
      const inventoryFactor = this.inventoryTarget[commodity] != 0 ? clamp(((this.inventoryTarget[commodity] - this.inventoryCurrent[commodity]) / this.inventoryTarget[commodity]), -1, 1) : -1
      // Balance of opinionPrice to marketPrice: -1 when marketPrice is double, 0 when same, 1 when marketPrice is 0
      const marketFactor = this.opinionPrice[commodity] != 0 ? (this.opinionPrice[commodity] - this.world.auctionHouse.marketAveragePrice[commodity]) / this.opinionPrice[commodity] : -100

      const isProfessionCommodity = this.bidProfessionCommodities.indexOf(commodity) != -1
      this.favorability[commodity] = ((isProfessionCommodity ? profitFactor : 0) + inventoryFactor + marketFactor) / 3
    }
    console.log(this.favorability["food"])
  }
  tickProduction() {
    
  }
  tickOffers() {
    
  }
  tickTax() {
    this.currency -= 2
    this.world.reserveBank += 2
  }
  tickLifecycle() {
    this.age++
  }
  resolveOffer(offer: Offer) {

  }
}

export class Farmer extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "farmer"
    this.postConstructor()
  }
}

export class Lumberjack extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "lumberjack"
    this.postConstructor()
  }
}

export class Miner extends Agent {
  constructor(world: World) {
    super(world)
    this.type = "miner"
    this.postConstructor()
  }
}