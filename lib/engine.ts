export type CropKey = 'paddy'|'groundnut'|'greengram'|'millet';
export type PriorityKey = 'water'|'soil'|'income'|'resilience';
export type Profile = {currentRotation:'paddy-paddy'|'paddy-greengram'|'groundnut-greengram';goal:PriorityKey;latitude:number;longitude:number;soil:'loam'|'clay'|'sandy';water:'low'|'medium'|'high';season:'rabi'|'kharif'; priorities:Record<PriorityKey,number>};
export type Climate = {monthly:{month:string;rain:number;temp:number;heatDays:number}[]; avgTemp:number;annualRain:number;heatDays:number;yearRange:string;source:'NASA POWER'|'Illustrative';currentSeason?:{year:number;through:string;validDays:number;rainfallToDate:number;meanTempToDate:number;hotDaysToDate:number;monthly:{month:string;rain:number;temp:number}[]}|null;currentSeasonNote?:string;baselineNote?:string;};
export const cropInfo: Record<CropKey,{name:string;latin:string;water:number;soil:number;income:number;resilience:number; nitrogen:boolean;clayPenalty:number;sandBonus:number;duration:string}> = {
 paddy:{name:'Paddy',latin:'Oryza sativa',water:18,soil:35,income:65,resilience:33,nitrogen:false,clayPenalty:0,sandBonus:-10,duration:'100–150 days'},
 groundnut:{name:'Groundnut',latin:'Arachis hypogaea',water:74,soil:78,income:63,resilience:67,nitrogen:true,clayPenalty:-22,sandBonus:8,duration:'100–120 days'},
 greengram:{name:'Green gram',latin:'Vigna radiata',water:81,soil:87,income:56,resilience:76,nitrogen:true,clayPenalty:-12,sandBonus:4,duration:'60–75 days'},
 millet:{name:'Pearl millet',latin:'Pennisetum glaucum',water:93,soil:63,income:50,resilience:88,nitrogen:false,clayPenalty:-12,sandBonus:7,duration:'75–100 days'}
};
export type Strategy = {id:string;label:string;crops:CropKey[];intro:string; risks:string[];assumptions:string[]};
export const strategies: Strategy[] = [
 {id:'baseline',label:'Existing practice',crops:['paddy','paddy'],intro:'Continue a rice-dominant rotation. Familiar management, potentially high irrigation demand.',risks:['Higher irrigation needs if water is limited','Repeated crop families may sustain crop-specific pest pressure'],assumptions:['Existing practice is illustrative; replace with the actual farm rotation']},
 {id:'legume',label:'Water-conscious rotation',crops:['paddy','groundnut'],intro:'Follow rice with a legume, exploring nitrogen cycling and different water demands.',risks:['Groundnut is sensitive to waterlogging and poorly drained clay','Market access and timing require farmer confirmation'],assumptions:['Rhizobial nodulation and nitrogen benefits depend on soil and crop management']},
 {id:'soil',label:'Soil-first rotation',crops:['paddy','greengram'],intro:'Introduce a short-duration legume to diversify the cycle and consider soil-cover benefits.',risks:['Short crop establishment windows may constrain planting','Yield and local prices have not been validated'],assumptions:['Soil health is approximated from crop traits, not measured organic matter']}
];
export function evaluate(profile:Profile,climate:Climate|null) {
 const weightTotal=Object.values(profile.priorities).reduce((a,b)=>a+b,0)||1;
 const climateHeat = climate? Math.max(0,Math.min(12,(climate.heatDays-75)/15)) : 0;
 const baselineCrops:CropKey[] = profile.currentRotation==='paddy-greengram'?['paddy','greengram']:profile.currentRotation==='groundnut-greengram'?['groundnut','greengram']:['paddy','paddy'];
 return strategies.map(original=>{
  const s = original.id==='baseline'?{...original,crops:baselineCrops,intro:'The current crop sequence provided by the farmer, used as the comparison baseline.',assumptions:['Baseline is based on farmer input; crop dates and soil conditions are not independently verified.']}:original;
  const crops=s.crops.map(c=>cropInfo[c]);
  const dimensions:Record<PriorityKey,number>={water:0,soil:0,income:0,resilience:0};
  (Object.keys(dimensions) as PriorityKey[]).forEach(k=>{
   dimensions[k]=crops.reduce((a,c)=>a+c[k],0)/crops.length;
  });
  const soilModifier = crops.reduce((a,c)=>a+(profile.soil==='clay'?c.clayPenalty:profile.soil==='sandy'?c.sandBonus:0),0)/crops.length;
  dimensions.soil=Math.max(0,Math.min(100,dimensions.soil+soilModifier));
  if(profile.water==='low') dimensions.water=Math.max(0,dimensions.water-(s.id==='baseline'?12:0));
  if(profile.water==='high'&&s.id==='baseline') dimensions.water+=8;
  dimensions.resilience=Math.max(0,dimensions.resilience-climateHeat*(s.id==='baseline'?1.0:0.35));
  if(profile.season==='rabi'&&s.id==='baseline') dimensions.water=Math.max(0,dimensions.water-5);
  const score=Math.round((Object.keys(dimensions) as PriorityKey[]).reduce((acc,k)=>acc+dimensions[k]*profile.priorities[k],0)/weightTotal);
  return {...s,dimensions,score,evidence:[climate ? `NASA POWER ${climate.yearRange}: ${climate.annualRain.toFixed(0)} mm/year mean historical precipitation and ${climate.avgTemp.toFixed(1)}°C mean temperature.` : 'NASA climate is not loaded; no satellite-derived score adjustment applied.',`Soil: ${profile.soil}; irrigation availability: ${profile.water}; season: ${profile.season}.`,`Crop trait assumptions: ${s.crops.map(c=>cropInfo[c].name).join(' → ')}; compare locally before planting.`],gaps:['No field-scale measured soil nutrients or organic carbon','No verified crop-market prices, field yields or local pest records','Regional climate is not a field-specific forecast']};
 }).sort((a,b)=>b.score-a.score);
}
export const sampleClimate:Climate={source:'Illustrative',yearRange:'demo values — not observations',avgTemp:29.1,annualRain:1002,heatDays:104,monthly:[{month:'Jan',rain:24,temp:24.3,heatDays:1},{month:'Feb',rain:15,temp:26.1,heatDays:2},{month:'Mar',rain:18,temp:29.4,heatDays:6},{month:'Apr',rain:36,temp:32.1,heatDays:13},{month:'May',rain:60,temp:33.3,heatDays:19},{month:'Jun',rain:53,temp:31.5,heatDays:13},{month:'Jul',rain:88,temp:30.9,heatDays:12},{month:'Aug',rain:125,temp:30.6,heatDays:11},{month:'Sep',rain:126,temp:29.9,heatDays:9},{month:'Oct',rain:183,temp:28.4,heatDays:7},{month:'Nov',rain:172,temp:26.2,heatDays:6},{month:'Dec',rain:102,temp:24.6,heatDays:5}]};
