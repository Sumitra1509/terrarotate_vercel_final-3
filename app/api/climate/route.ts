import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
const labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type Series=Record<string,number>;
type Power={properties?:{parameter?:{T2M?:Series;T2M_MAX?:Series;PRECTOTCORR?:Series}}};
async function power(lat:number,lon:number,start:string,end:string):Promise<{data:Power;url:string}> {
 const url=new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
 for(const [k,v] of Object.entries({parameters:'T2M,T2M_MAX,PRECTOTCORR',community:'AG',longitude:String(lon),latitude:String(lat),start,end,format:'JSON','time-standard':'UTC'}))url.searchParams.set(k,v);
 const res=await fetch(url,{signal:AbortSignal.timeout(32000),next:{revalidate:43200}});
 if(!res.ok)throw new Error(`NASA POWER returned ${res.status}`);
 const data=await res.json() as Power;
 const p=data.properties?.parameter;
 if(!p?.T2M||!p.PRECTOTCORR||!p.T2M_MAX)throw new Error('NASA POWER response is missing required parameters');
 return {data,url:url.toString()};
}
function summarize(data:Power){
 const p=data.properties!.parameter!;
 const buckets=Array.from({length:12},()=>({rain:0,temp:0,days:0,heatDays:0}));
 let validDays=0,totalRain=0,totalTemp=0,totalHeat=0;
 let latest='';
 for(const [date,v] of Object.entries(p.T2M!)){
  const rain=p.PRECTOTCORR![date],max=p.T2M_MAX![date],m=Number(date.slice(4,6))-1;
  if(m<0||m>11||typeof v!=='number'||typeof rain!=='number'||typeof max!=='number'||!Number.isFinite(v)||!Number.isFinite(rain)||!Number.isFinite(max)||v<=-900||rain<=-900||max<=-900)continue;
  const b=buckets[m];b.rain+=rain;b.temp+=v;b.days++;
  if(max>=35){b.heatDays++;totalHeat++}
  validDays++;totalRain+=rain;totalTemp+=v;
  if(date>latest)latest=date;
 }
 return {buckets,validDays,totalRain,totalTemp,totalHeat,latest};
}
export async function GET(req:NextRequest){
 const lat=Number(req.nextUrl.searchParams.get('lat')??12.9165),lon=Number(req.nextUrl.searchParams.get('lon')??79.1325);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90||lon< -180||lon>180)return NextResponse.json({error:'Invalid coordinates'},{status:400});
 const startYear=2020;
 const now=new Date();
 // Use complete years for annual averages; fetch the current year separately.
 const baselineEnd=Math.min(now.getUTCFullYear()-1,2025);
 if(baselineEnd<startYear)return NextResponse.json({error:'A completed-year climate baseline is not available'},{status:503});
 try {
  const baseline=await power(lat,lon,`${startYear}0101`,`${baselineEnd}1231`);
  const summary=summarize(baseline.data);
  if(summary.validDays<365)throw new Error('Insufficient complete-year NASA observations');
  const years=baselineEnd-startYear+1;
  const monthly=summary.buckets.map((b,i)=>({month:labels[i],rain:Math.round(b.rain/years),temp:Number((b.temp/(b.days||1)).toFixed(1)),heatDays:Math.round(b.heatDays/years)}));
  let currentSeason:null|{year:number;through:string;validDays:number;rainfallToDate:number;meanTempToDate:number;hotDaysToDate:number;monthly:{month:string;rain:number;temp:number}[]}=null;
  let currentSeasonNote='';
  const currentYear=now.getUTCFullYear();
  // Seven days of lag accommodates NASA near-real-time processing. Never call current year a full-year average.
  const latestRequest=new Date(now.getTime()-7*86400000);
  if(currentYear>baselineEnd&&latestRequest.getUTCFullYear()===currentYear){
   const end=[latestRequest.getUTCFullYear(),String(latestRequest.getUTCMonth()+1).padStart(2,'0'),String(latestRequest.getUTCDate()).padStart(2,'0')].join('');
   try{
    const recent=await power(lat,lon,`${currentYear}0101`,end);
    const s=summarize(recent.data);
    if(s.validDays>0){
     currentSeason={year:currentYear,through:`${s.latest.slice(0,4)}-${s.latest.slice(4,6)}-${s.latest.slice(6,8)}`,validDays:s.validDays,rainfallToDate:Math.round(s.totalRain),meanTempToDate:Number((s.totalTemp/s.validDays).toFixed(1)),hotDaysToDate:s.totalHeat,monthly:s.buckets.map((b,i)=>({month:labels[i],rain:Math.round(b.rain),temp:b.days?Number((b.temp/b.days).toFixed(1)):0}))};
    } else currentSeasonNote=`${currentYear} data were requested but no valid observations have been returned yet.`;
   }catch(e){currentSeasonNote=`${currentYear} near-real-time observations are temporarily unavailable; historical data remain valid.`;}
  }
  return NextResponse.json({source:'NASA POWER',yearRange:`${startYear}–${baselineEnd}`,monthly,annualRain:summary.totalRain/years,avgTemp:summary.totalTemp/summary.validDays,heatDays:Math.round(summary.totalHeat/years),currentSeason,currentSeasonNote,dataURL:baseline.url,gridNote:'NASA POWER regional gridded meteorology; not measured conditions at an individual field',baselineNote:`Annual statistics use only ${years} completed calendar years. Current-year figures, when available, are reported separately as year-to-date totals.`},{headers:{'Cache-Control':'public, s-maxage=43200, stale-while-revalidate=43200'}});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:'NASA POWER unavailable',source:'NASA POWER'},{status:502});}
}
