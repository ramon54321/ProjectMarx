import { World, Commodities, COMMODITIES, average } from './index'
import { Agent } from './Agent';

export type OfferType = "bid" | "ask"
export type OfferStatus = "pending" | "accepted" | "rejected"

export interface Offer {
  type: OfferType,
  status: OfferStatus,
  agent: Agent,
  commodity: string,
  price: number,
  count: number,
  clearingPrice?: number,
  clearingCount?: number,
}

export class AuctionHouse {
  world: World

  bids: any = {}
  asks: any = {}

  marketAveragePrice: Commodities
  marketAverageBid: Commodities
  marketAverageAsk: Commodities

  marketDemand: Commodities

  constructor(world: World) {
    this.world = world
    this.marketAveragePrice = new Commodities()
    this.marketAverageBid = new Commodities()
    this.marketAverageAsk = new Commodities()
    this.marketDemand = new Commodities()
    for (const commodity of COMMODITIES) {
      this.bids[commodity] = []
      this.asks[commodity] = []
      this.marketAverageBid[commodity] = 1
      this.marketAverageAsk[commodity] = 1
      this.marketDemand[commodity] = 0
    }
  }

  tickMarket() {
    for (const commodity of COMMODITIES) {
      if (this.bids[commodity].length > 0) {
        this.marketAverageBid[commodity] = this.bids[commodity].reduce((acc, offer) => acc + offer.price, 0) / this.bids[commodity].length
      }
      if (this.asks[commodity].length > 0) {
        this.marketAverageAsk[commodity] = this.asks[commodity].reduce((acc, offer) => acc + offer.price, 0) / this.asks[commodity].length
      }
    }
    for (const commodity of COMMODITIES) {
      this.marketAveragePrice[commodity] = average(this.marketAverageBid[commodity], this.marketAverageAsk[commodity])
      this.marketDemand[commodity] = this.world.agents.reduce((demand, agent) => demand + agent.inventoryFactor[commodity], 0)
    }
  }

  bid(agent: Agent, commodity: string, price: number, count: number) {
    this.bids[commodity].push({
      type: "bid",
      status: "pending",
      agent: agent,
      commodity: commodity,
      price: price,
      count: count,
    })
  }

  ask(agent: Agent, commodity: string, price: number, count: number) {
    this.asks[commodity].push({
      type: "ask",
      status: "pending",
      agent: agent,
      commodity: commodity,
      price: price,
      count: count,
    })
  }

  tickResolveOffers() {
    for (const commodity of COMMODITIES) {
      // Sort bids from highest to lowest price
      this.bids[commodity].sort((a, b) => b.price - a.price)
      // Sort asks from lowest to highest price
      this.asks[commodity].sort((a, b) => a.price - b.price)
    }

    // Track accepted offers
    const acceptedOffers: Offer[] = []
    for (const commodity of COMMODITIES) {
      while (this.bids[commodity].length != 0 && this.asks[commodity].length != 0) {
        const bid: Offer = this.bids[commodity][0]
        const ask: Offer = this.asks[commodity][0]
        const clearingPrice = average(bid.price, ask.price)
        const maxCount = Math.floor(Math.max(bid.agent.currency, 0) / clearingPrice)
        const clearingCount = Math.min(Math.min(bid.count, ask.count), maxCount)

        if(maxCount == 0) {
          this.bids[commodity].shift()
          bid.status = "rejected"
          bid.agent.resolveOffer(bid)
          this.asks[commodity].shift()
          ask.status = "rejected"
          ask.agent.resolveOffer(ask)
          continue
        }

        if (clearingCount > 0) {
          bid.count -= clearingCount
          ask.count -= clearingCount
          ask.agent.inventoryCurrent[ask.commodity] -= clearingCount
          bid.agent.inventoryCurrent[bid.commodity] += clearingCount
          bid.agent.currency -= clearingCount * clearingPrice
          ask.agent.currency += clearingCount * clearingPrice
          acceptedOffers.push({
            type: bid.type,
            status: "accepted",
            agent: bid.agent,
            commodity: bid.commodity,
            price: bid.price,
            count: bid.count,
            clearingPrice: clearingPrice,
            clearingCount: clearingCount,
          })
          acceptedOffers.push({
            type: ask.type,
            status: "accepted",
            agent: ask.agent,
            commodity: ask.commodity,
            price: ask.price,
            count: ask.count,
            clearingPrice: clearingPrice,
            clearingCount: clearingCount,
          })
        }

        if (bid.count == 0) {
          this.bids[commodity].shift()
        }
  
        if (ask.count == 0) {
          this.asks[commodity].shift()
        }
      }
  
      acceptedOffers.forEach(offer => offer.agent.resolveOffer(offer))
  
      // Reject remaining
      if (this.bids[commodity].length > 0 && this.asks[commodity].length > 0) {
        console.log("Both books non-empty")
      }
      
      while (this.bids[commodity].length > 0) {
        const bid: Offer = this.bids[commodity].shift()
        bid.status = "rejected"
        bid.agent.resolveOffer(bid)
      }
  
      while (this.asks[commodity].length > 0) {
        const ask: Offer = this.asks[commodity].shift()
        ask.status = "rejected"
        ask.agent.resolveOffer(ask)
      }
  
      if (this.bids[commodity].length > 0 || this.asks[commodity].length > 0) {
        console.log("Books not empty after rejections")
      }
    }
  }
}