// Presentation only. Data has already been filtered by server-side sharing permissions.
export const LOCATION_RECENT_MS=5*60*1000;
export function hasPosition(member){return !!member?.consent&&Number.isFinite(member.lat)&&Number.isFinite(member.lng)&&Math.abs(member.lat)<=90&&Math.abs(member.lng)<=180&&Number.isFinite(Date.parse(member.updated));}
export function locationState(member,now=Date.now()){
 if(!member.linked)return {key:'access',label:'Acesso por associar',tone:'amber'};
 if(!member.consent)return {key:'sharing',label:member.adult?'Aguarda autorização':'Partilha por autorizar',tone:'amber'};
 if(!hasPosition(member))return {key:'waiting',label:'Sem localização recebida',tone:'neutral'};
 const age=now-Date.parse(member.updated);
 return age>=0&&age<=LOCATION_RECENT_MS?{key:'recent',label:'Localização recente',tone:'green'}:{key:'old',label:'Última posição conhecida',tone:'amber'};
}
export function familySummary(members,now=Date.now()){
 const states=members.map(m=>locationState(m,now));
 return {recent:states.filter(s=>s.key==='recent').length,pending:states.filter(s=>s.key!=='recent').length,lowBattery:members.filter(m=>m.consent&&m.battery_consent&&Number.isFinite(m.battery)&&m.battery<=20).length};
}
export function mapLinks(member){
 if(!hasPosition(member))return null;
 const lat=member.lat,lng=member.lng;
 const q=new URLSearchParams({bbox:[Math.max(-180,lng-.012),Math.max(-90,lat-.008),Math.min(180,lng+.012),Math.min(90,lat+.008)].join(','),layer:'mapnik',marker:lat+','+lng});
 return {embed:'https://www.openstreetmap.org/export/embed.html?'+q.toString(),external:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`};
}
export function ageLabel(value,now=Date.now()){
 const elapsed=now-Date.parse(value);if(!Number.isFinite(elapsed))return 'Ainda sem atualização';
 if(elapsed<0)return 'Hora do dispositivo por verificar';
 if(elapsed<60000)return 'Há menos de 1 min';
 if(elapsed<3600000)return `Há ${Math.floor(elapsed/60000)} min`;
 if(elapsed<86400000)return `Há ${Math.floor(elapsed/3600000)} h`;
 return new Date(value).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
