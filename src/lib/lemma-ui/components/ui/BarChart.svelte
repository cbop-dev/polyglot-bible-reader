<!---
    NB: this component requires being with in a {#key} to be "reactive":
    {#k3ey barData} 
    <BarChart {barData}... />
    {/key}

    This is because of the way that Chart.js. It doesn't handle constantly updated data well--this causes loops.
    
-->
<script>
import { mylog } from '../../env/env';
import Chart from 'chart.js/auto';
import { generateHslColorGradient } from './chartUtils';
/**
 * @typedef Props
 * @property {{labels: string[], nums: number[]}} barData
 * @property {string} [title]
 * @property {function} [onclick]
 * @property   {string} [xAxisLabel='']
 * * @property   {string} [yAxisLabel='']
 * @property {string} [corpusAbbrev='LXX']
 * @property {boolean} [horizontal=false]
*/
/**
 * @type {Props}
 */
let {   
    barData={labels:[], nums:[]},
    horizontal=false,
    yAxisLabel='',
    xAxisLabel='',
    title="",
    corpusAbbrev="LXX",
     onclick=(items)=>{},
} = $props();

const barData2 = {labels: barData.labels ? [...barData.labels] : [], nums: barData.nums ? [...barData.nums] : []};

let type = 'bar';


function defaultData() {
    return {
        labels: ['Section freq.',corpusAbbrev + " freq."],
        datasets: [{
            data: [1, 2],
            backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(255, 205, 86)'
            ],
            hoverOffset: 10
        }]
    }
}

let data = $derived.by(()=>{
    const theData = defaultData();
    if (barData2.labels && barData2.labels.length){
        theData.labels  =[];
        
        barData2.labels.forEach((l)=>{
            theData.labels.push(l);
            
        })
    }

    if (barData2.nums.length){
        theData.datasets[0].data=[]
        mylog("building bar data with [" + barData2.nums.join(',') + ']')
        barData2.nums.forEach((n)=>{
            theData.datasets[0].data.push(n)
            
        })
    }
    
    if (barData2.nums.length > 2){
        theData.datasets[0].backgroundColor = generateHslColorGradient(barData2.nums.length);
    }

    return theData;
});

function getComputedThemeColors() {
		if (typeof document === 'undefined') return { text: '#1e293b', grid: 'rgba(0,0,0,0.1)' };
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
		return {
			text: isDark ? '#e2e8f0' : '#1e293b',
			grid: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
		};
	}

	let options = $derived.by(() => {
		const colors = getComputedThemeColors();
		const opts = {
			plugins: {
				legend: { display: false }
			},
			scales: {
				x: {
					ticks: { color: colors.text, font: { family: 'inherit' } },
					grid: { color: colors.grid }
				},
				y: {
					beginAtZero: true,
					ticks: { color: colors.text, font: { family: 'inherit' } },
					grid: { color: colors.grid }
				}
			}
		};

		if (horizontal) {
			opts.indexAxis = 'y';
		}

		if (yAxisLabel) {
			opts.scales.y.title = { display: true, text: yAxisLabel, color: colors.text };
		}

		return opts;
	});

	let config = $derived({
		type,
		data: data,
		options
	});

let theChart = null;
function handleChart(element, config) {
    //mylog("handling bubble chart...")
		theChart = new Chart(element, config)
		
		return {
			update(config) {
				theChart.destroy()
				theChart = new Chart(element, config)
			},
			destroy() {
				theChart.destroy()
			}
		}
}
//$inspect(barData2)
</script>
{#if title}
<h3>{title}</h3>
{/if}
<canvas use:handleChart={config} ></canvas>

