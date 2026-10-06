<!---
    NB: this component requires being with in a {#key} to be "reactive":
    {#k3ey pieData} 
    <PieChart {pieData}... />
    {/key}

    This is because of the way that Chart.js. It doesn't handle constantly updated data well--this causes loops.
    
-->
<script>
import { mylog } from '../../env/env';
import Chart from 'chart.js/auto';

/**
 * @typedef PieProps
 * @property {{labels: string[], nums: number[]}} [pieData]
 * @property {string} [title]
 * @property {function} [onclick]
 */
/**
 * @type {PieProps}
 */
let {   
    pieData={labels:[], nums:[]},

    title="",
     onclick=(items)=>{},
} = $props();

const pieData2 = {labels: pieData.labels ? [...pieData.labels] : [], nums: pieData.nums ? [...pieData.nums] : []};

let type = 'pie';


function defaultData() {
    return {
        labels: ['Section','Rest of LXX'],
        datasets: [{
            data: [50, 300],
            backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(255, 205, 86)'
            ],
            hoverOffset: 30
        }]
    }
}

let data = $derived.by(()=>{
    const theData = defaultData();
    if (pieData2.labels && pieData2.labels.length){
        theData.labels  =[];
        
        pieData2.labels.forEach((l)=>{
            theData.labels.push(l);
            
        })
    }

    if (pieData2.nums.length){
        theData.datasets[0].data=[]
        mylog("building pie data with [" + pieData2.nums.join(',') + ']')
        pieData2.nums.forEach((n)=>{
            theData.datasets[0].data.push(n)
            
        })
    }
            
    return theData;
});

function getComputedThemeColors() {
    if (typeof document === 'undefined') return { text: '#1e293b' };
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#e2e8f0' : '#1e293b'
    };
}

let options = $derived.by(() => {
    const colors = getComputedThemeColors();
    return {
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: colors.text
                }
            }
        }
    };
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
</script>
{#if title}
<h3>{title}</h3>
{/if}
<canvas use:handleChart={config}></canvas>