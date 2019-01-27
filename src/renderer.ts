import { Chart as _Chart } from 'chart.js'
declare var Chart: typeof _Chart
declare var R: any

import { World, Commodities, COMMODITIES } from './index'
import { Agent } from './Agent';
import { Offer } from './AuctionHouse';

const tickRange: number[] = []
for (let i = 0; i < 100; i++) {
  tickRange[i] = i
}

const COLORS = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)',
  none: 'rgba(0,0,0,0)'
}

export class Renderer {
  world: World

  historyAvgBid: Commodities[]
  historyAvgAsk: Commodities[]

  history: Commodities[][]

  chart: any
  chartLength: number = 200

  selectedAgent: Agent

  constructor(world: World) {
    this.world = world

    this.historyAvgBid = []
    this.historyAvgAsk = []

    this.history = [
      this.historyAvgBid,
      this.historyAvgAsk,
    ]

    const ctx = document.getElementById("price")
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Bid Food',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.green,
          borderColor: COLORS.green,
          borderDash: [4,4],
          data: [],
          fill: false,
        },{
          label: 'Ask Food',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.green,
          borderColor: COLORS.green,
          data: [],
          fill: false,
        },{
          label: 'Bid Wood',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.yellow,
          borderColor: COLORS.yellow,
          borderDash: [4,4],
          data: [],
          fill: false,
        },{
          label: 'Ask Wood',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.yellow,
          borderColor: COLORS.yellow,
          data: [],
          fill: false,
        },{
          label: 'Bid Iron',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.grey,
          borderColor: COLORS.grey,
          borderDash: [4,4],
          data: [],
          fill: false,
        },{
          label: 'Ask Iron',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.grey,
          borderColor: COLORS.grey,
          data: [],
          fill: false,
        },{
          label: 'Bid Tools',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.blue,
          borderColor: COLORS.blue,
          borderDash: [4,4],
          data: [],
          fill: false,
        },{
          label: 'Ask Tools',
          pointBackgroundColor: COLORS.none,
          pointBorderColor: COLORS.none,
          backgroundColor: COLORS.blue,
          borderColor: COLORS.blue,
          data: [],
          fill: false,
        }]
      },
      options: {
				responsive: true,
				title: {
					display: true,
					text: 'Bid / Ask'
				},
				tooltips: {
					mode: 'index',
					intersect: false,
        },
        animation: {
          duration: 0, // general animation time
        },
				hover: {
					mode: 'nearest',
          intersect: true,
          animationDuration: 0,
        },
      }
    })
  }

  selectAgent(agentId: string) {
    this.selectedAgent = R.find(
      R.propEq("id", agentId),
      this.world.agents)
    this.renderAgentInfo()
  }

  renderAgentInfo() {
    if (!this.selectedAgent) {
      document.getElementById("agentinfo").innerHTML = ""
      return
    }

    const tables: string[] = []

    tables.push(`<h3>Agent ${this.selectedAgent.id} - ${this.selectedAgent.type}</h3>`)

    tables.push(`
    <table>
      <tr>
        <th>Currency</th>
        <th>Profit Factor</th>
      </tr>
      <tr>
        <td>${this.selectedAgent.currency.toFixed(0)}</td>
        <td>${this.selectedAgent.profitFactor.toFixed(3)}</td>
      </tr>
    </table>
  `)

    tables.push(`
      <table>
        <tr>
          <th>Commodities</th>
          <th>Inventory Current</th>
          <th>Inventory Target</th>
          <th>Opinion Price</th>
          <th>Favorability</th>
          <th>Bid Favorability Multiplier</th>
          <th>Ask Demand Multiplier</th>
          <th>Inventory Factor</th>
          <th>Market Factor</th>
        </tr>
        ${COMMODITIES.map(commodity => `
        <tr>
          <td>${commodity}</td>
          <td>${this.selectedAgent.inventoryCurrent[commodity].toFixed(1)}</td>
          <td>${this.selectedAgent.inventoryTarget[commodity].toFixed(1)}</td>
          <td>${this.selectedAgent.opinionPrice[commodity].toFixed(2)}</td>
          <td>${this.selectedAgent.favorability[commodity].toFixed(3)}</td>
          <td>${this.selectedAgent.bidFavorabilityMultiplier[commodity].toFixed(3)}</td>
          <td>${this.selectedAgent.askDemandMultiplier[commodity].toFixed(3)}</td>
          <td>${this.selectedAgent.inventoryFactor[commodity].toFixed(3)}</td>
          <td>${this.selectedAgent.marketFactor[commodity].toFixed(3)}</td>
        </tr>
        `).join("")}
      </table>
    `)

    const infoElement: HTMLElement = document.getElementById("agentinfo")
    infoElement.innerHTML = tables.join("")
  }

  tick() {
    this.tickInfo()
    this.tickCharts()
    this.renderAgentInfo()
  }
  
  tickInfo() {
    const tables: string[] = []

    tables.push(`<h3>Info</h3>`)

    tables.push(`
      <table>
        <tr>
          <th>Bank Currency</th>
        </tr>
        <tr>
          <td>${this.world.reserveBank}</td>
        </tr>
      </table>
    `)

    tables.push(`
      <table>
        <tr>
          <th>Commodity</th>
          <th>Demand</th>
          <th>Price</th>
          <th>Bid</th>
          <th>Ask</th>
        </tr>
        ${COMMODITIES.map(commodity => `
        <tr>
          <td>${commodity}</td>
          <td>${this.world.auctionHouse.marketDemand[commodity].toFixed(0)}</td>
          <td>${this.world.auctionHouse.marketAveragePrice[commodity].toFixed(2)}</td>
          <td>${this.world.auctionHouse.marketAverageBid[commodity].toFixed(2)}</td>
          <td>${this.world.auctionHouse.marketAverageAsk[commodity].toFixed(2)}</td>
        </tr>
        `).join("")}
      </table>
    `)

    tables.push(`
      <table>
        <tr>
          <th>Agent</th>
          <th>Profession</th>
          <th>Age</th>
          <th>Currency</th>
        </tr>
        ${this.world.agents.map(agent => `
        <tr onclick="window.showInfo('${agent.id}')"}>
          <td>${agent.id}</td>
          <td>${agent.type}</td>
          <td>${agent.age}</td>
          <td>${agent.currency.toFixed(2)}</td>
        </tr>
        `).join("")}
      </table>
    `)

    tables.push(`<h4>Bids</h4>`)

    tables.push(`
      <table>
        <tr>
          <th>Agent</th>
          <th>Profession</th>
          <th>Commodity</th>
          <th>Status</th>
          <th>Market Price</th>
          <th>Offer Price</th>
        </tr>
        ${COMMODITIES.map(commodity => `
        ${this.world.auctionHouse.bids[commodity].map((bid: Offer) => `
        <tr onclick="window.showInfo('${bid.agent.id}')">
          <td>${bid.agent.id}</td>
          <td>${bid.agent.type}</td>
          <td>${bid.commodity}</td>
          <td>${bid.status}</td>
          <td>${this.world.auctionHouse.marketAveragePrice[bid.commodity].toFixed(2)}</td>
          <td>${bid.price.toFixed(2)}</td>
        </tr>
        `).join("")}
        `).join("")}
      </table>
    `)

    tables.push(`<h4>Asks</h4>`)

    tables.push(`
      <table>
        <tr>
          <th>Agent</th>
          <th>Profession</th>
          <th>Commodity</th>
          <th>Status</th>
          <th>Market Price</th>
          <th>Offer Price</th>
        </tr>
        ${COMMODITIES.map(commodity => `
        ${this.world.auctionHouse.asks[commodity].map((ask: Offer) => `
        <tr onclick="window.showInfo('${ask.agent.id}')">
          <td>${ask.agent.id}</td>
          <td>${ask.agent.type}</td>
          <td>${ask.commodity}</td>
          <td>${ask.status}</td>
          <td>${this.world.auctionHouse.marketAveragePrice[ask.commodity].toFixed(2)}</td>
          <td>${ask.price.toFixed(2)}</td>
        </tr>
        `).join("")}
        `).join("")}
      </table>
    `)

    const infoElement: HTMLElement = document.getElementById("info")
    infoElement.innerHTML = tables.join("")
  }

  tickCharts() {
    // Push new data
    this.historyAvgBid.push(JSON.parse(JSON.stringify(this.world.auctionHouse.marketAverageBid)))
    this.historyAvgAsk.push(JSON.parse(JSON.stringify(this.world.auctionHouse.marketAverageAsk)))

    // Trim old data
    this.history.forEach(historyData => {
      if (historyData.length > this.chartLength) {
        historyData.shift()
      }
    })

    // Update charts
    this.chart.data.labels.push(this.world.tickCount)
    this.chart.data.datasets[0].data.push(this.historyAvgBid[this.historyAvgBid.length-1]["food"])
    this.chart.data.datasets[1].data.push(this.historyAvgAsk[this.historyAvgAsk.length-1]["food"])
    this.chart.data.datasets[2].data.push(this.historyAvgBid[this.historyAvgBid.length-1]["wood"])
    this.chart.data.datasets[3].data.push(this.historyAvgAsk[this.historyAvgAsk.length-1]["wood"])
    this.chart.data.datasets[4].data.push(this.historyAvgBid[this.historyAvgBid.length-1]["iron"])
    this.chart.data.datasets[5].data.push(this.historyAvgAsk[this.historyAvgAsk.length-1]["iron"])
    this.chart.data.datasets[6].data.push(this.historyAvgBid[this.historyAvgBid.length-1]["tools"])
    this.chart.data.datasets[7].data.push(this.historyAvgAsk[this.historyAvgAsk.length-1]["tools"])

    if (this.chart.data.labels.length > this.chartLength) {
      this.chart.data.labels.shift()
      this.chart.data.datasets[0].data.shift()
      this.chart.data.datasets[1].data.shift()
      this.chart.data.datasets[2].data.shift()
      this.chart.data.datasets[3].data.shift()
      this.chart.data.datasets[4].data.shift()
      this.chart.data.datasets[5].data.shift()
      this.chart.data.datasets[6].data.shift()
      this.chart.data.datasets[7].data.shift()
    }

    this.chart.update()
  }
}
