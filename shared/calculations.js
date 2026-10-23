import Decimal from 'decimal.js';
import {groupKey} from './schema.js';
const D=v=>new Decimal(v);
// Weighted average cost. Document balances are checkpoints, never cash flows.
export function calculate(ledger,historyComplete=false,valuations={}){
  const keys=new Set([...ledger.transactions,...ledger.snapshots].map(groupKey));
  return [...keys].map(key=>{
    const tx=ledger.transactions.filter(t=>groupKey(t)===key).sort((a,b)=>a.date.localeCompare(b.date));
    const snaps=ledger.snapshots.filter(s=>groupKey(s)===key).sort((a,b)=>a.date.localeCompare(b.date));
    const sample=tx[0]||snaps[0]; let quantity=D(0),cost=D(0),profit=D(0),known=historyComplete,complete=historyComplete;
    const warnings=[];const first=snaps[0];
    if(first && first.opening!==null && (!tx[0] || first.date<=tx[0].date.slice(0,10))){
      quantity=D(first.opening);known=quantity.isZero()||first.openingAverage!==null;
      complete=known;cost=first.openingAverage===null?D(0):quantity.mul(first.openingAverage);
    }
    const days=[...new Set([...tx.map(t=>t.date.slice(0,10)),...snaps.map(s=>s.date)])].sort();
    for(const date of days){
      const snap=snaps.find(s=>s.date===date);
      if(snap && snap.opening!==null && !quantity.eq(snap.opening)){
        warnings.push(date+': น้ำหนักยกมาไม่ตรงกับประวัติ');quantity=D(snap.opening);known=quantity.isZero();cost=D(0);complete=false;
      }
      const dayTrades=tx.filter(t=>t.date.startsWith(date));
      const times=new Map();for(const t of dayTrades){const time=t.date.length===16?t.date+':00':t.date;const types=times.get(time)||new Set();types.add(t.type);times.set(time,types);}
      if([...times.values()].some(types=>types.size>1)){warnings.push(date+': ซื้อและขายเวลาเดียวกัน ไม่ทราบลำดับสำหรับคำนวณต้นทุน');known=false;complete=false;}
      for(const t of dayTrades){
        const w=D(t.weight),a=D(t.amount),f=D(t.fee);
        if(t.type==='buy'){quantity=quantity.plus(w);cost=cost.plus(a).plus(f);}
        else {
          if(w.gt(quantity)){warnings.push(date+': ขายเกินน้ำหนักในประวัติ');known=false;complete=false;}
          const basis=known && quantity.gt(0)?cost.mul(w).div(quantity):D(0);
          if(known)profit=profit.plus(a).minus(f).minus(basis);else complete=false;
          quantity=quantity.minus(w);cost=cost.minus(basis);
          if(quantity.isZero()){known=true;cost=D(0);}
        }
      }
      if(snap && !quantity.eq(snap.closing)){
        warnings.push(date+': ยอดปิดไม่ตรงกับธุรกรรม ข้อมูลอาจไม่ครบ');
        quantity=D(snap.closing);known=quantity.isZero();cost=D(0);complete=false;
      }
    }
    const valuation=valuations[key]; const market=valuation&&quantity.gte(0)?quantity.mul(valuation):null;
    return {key,provider:sample.provider,goldType:sample.goldType,unit:sample.unit,currency:sample.currency,
      quantity:quantity.toString(),cost:known?cost.toFixed(2):null,average:known&&quantity.gt(0)?cost.div(quantity).toFixed(8):null,
      realized:complete?profit.toFixed(2):null,unrealized:market!==null&&known?market.minus(cost).toFixed(2):null,
      warnings,buyCount:tx.filter(t=>t.type==='buy').length,sellCount:tx.filter(t=>t.type==='sell').length};
  });
}
