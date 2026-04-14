import React from 'react';
import { ShieldAlert, Info, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MARGIN_CONFIG, getRiskLevel } from '../../utils/loanEngine';
import { useFormatters } from '../../hooks/useFormatters';

const LoanInfoPanel = ({ borrowedAmount, totalValue, interest }) => {
  const { formatCurrency } = useFormatters();
  const risk = getRiskLevel(borrowedAmount, totalValue);

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-warning">
          <ShieldAlert size={16} />
          <span className="text-xs font-black uppercase tracking-widest">Smart Credit Active</span>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
          risk === 'HIGH' ? "bg-danger text-white" :
          risk === 'MEDIUM' ? "bg-warning text-black" : "bg-success text-white"
        )}>
          Risk: {risk}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Borrowed</p>
          <p className="text-sm font-bold tabular-nums text-warning">{formatCurrency(borrowedAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Est. Interest</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(interest)}</p>
        </div>
      </div>

      <div className="flex items-start space-x-2 p-2 bg-warning/10 rounded-lg">
        <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
        <p className="text-[10px] text-warning/80 leading-tight font-medium">
          Liquidation occurs if loss exceeds {MARGIN_CONFIG.LIQUIDATION_THRESHOLD * 100}%. 
          Repayment is automatic upon selling.
        </p>
      </div>
    </div>
  );
};

export default LoanInfoPanel;
