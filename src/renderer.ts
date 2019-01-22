import { Chart as _Chart } from 'chart.js'
declare var Chart: typeof _Chart

import { World, Commodities } from './index'

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
  tick() {
    // Push new data
    this.historyAvgBid.push(JSON.parse(JSON.stringify(this.world.auctionHouse.marketAverageBid)))
    this.historyAvgAsk.push(JSON.parse(JSON.stringify(this.world.auctionHouse.marketAverageAsk)))

    // Trim old data
    this.history.forEach(historyData => {
      if (historyData.length > 100) {
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
    this.chart.update()
  }
}