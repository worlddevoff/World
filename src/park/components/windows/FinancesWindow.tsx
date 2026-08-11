import React from 'react';
import { Window, StatRow, Sunken, RctButton } from '../Window';
import { useGame } from '../../store/gameStore';
import { fmtMoney } from '../StatusBar';

export function FinancesWindow() {
  const s = useGame();
  const setAdmission = useGame((st) => st.setAdmission);
  const f = s.finance;
  const income = f.rideIncome + f.shopIncome + f.admission;
  const expenses = f.staffWages + f.construction + f.research;
  const profit = income - expenses;

  return (
    <Window id="finances" title="Finances" width={260}>
      <Sunken className="flex flex-col gap-0.5 mb-2">
        <StatRow label="Cash" value={fmtMoney(s.cash)} color={s.cash < 0 ? '#b22222' : '#0a6b1f'} />
        <StatRow label="Loan" value={fmtMoney(s.loanAmount)} color="#b22222" />
      </Sunken>

      <div className="font-display text-sm mb-1">Income (this park)</div>
      <Sunken className="flex flex-col gap-0.5 mb-2">
        <StatRow label="Ride tickets" value={fmtMoney(f.rideIncome)} color="#0a6b1f" />
        <StatRow label="Shop sales" value={fmtMoney(f.shopIncome)} color="#0a6b1f" />
        <StatRow label="Admissions" value={fmtMoney(f.admission)} color="#0a6b1f" />
      </Sunken>

      <div className="font-display text-sm mb-1">Expenses</div>
      <Sunken className="flex flex-col gap-0.5 mb-2">
        <StatRow label="Staff wages" value={fmtMoney(f.staffWages)} color="#b22222" />
        <StatRow label="Construction" value={fmtMoney(f.construction)} color="#b22222" />
        <StatRow label="Research" value={fmtMoney(f.research)} color="#b22222" />
      </Sunken>

      <Sunken className="mb-2">
        <StatRow label="Total profit" value={fmtMoney(profit)} color={profit >= 0 ? '#0a6b1f' : '#b22222'} />
      </Sunken>

      <div className="font-display text-sm mb-1">Park admission price</div>
      <div className="flex items-center gap-1">
        <RctButton onClick={() => setAdmission(s.admissionPrice - 1)}>−</RctButton>
        <span className="sunken px-3 py-0.5 min-w-[60px] text-center font-bold">{fmtMoney(s.admissionPrice)}</span>
        <RctButton onClick={() => setAdmission(s.admissionPrice + 1)}>+</RctButton>
      </div>

      {s.financeHistory.length > 0 && (
        <>
          <div className="font-display text-sm mt-2 mb-1">Monthly profit</div>
          <ProfitGraph data={s.financeHistory} />
        </>
      )}
    </Window>
  );
}

function ProfitGraph({ data }: { data: number[] }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d)));
  return (
    <div className="sunken h-16 flex items-end gap-0.5 p-1">
      {data.map((d, i) => {
        const h = (Math.abs(d) / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col justify-end h-full">
            <div style={{ height: `${h}%`, background: d >= 0 ? '#3f9b52' : '#d94b4b' }} />
          </div>
        );
      })}
    </div>
  );
}
