import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRANSPORT_LABELS, type TransportType } from '@/config';

interface TransportSelectProps {
  transportType: TransportType;
  onTransportChange: (type: TransportType) => void;
  availableTransports: TransportType[];
}

/** Compact transport picker for the console header. */
export const TransportSelect = ({
  transportType,
  onTransportChange,
  availableTransports,
}: TransportSelectProps) => {
  const items = availableTransports.map((transport) => ({
    value: transport,
    label: TRANSPORT_LABELS[transport],
  }));

  return (
    <Select
      items={items}
      value={transportType}
      onValueChange={(value) => onTransportChange(value as TransportType)}>
      <SelectTrigger size="sm" aria-label="Transport" className="w-36 min-w-24 h-8 text-xs border-[#292B3A] bg-[#12141A] text-[#F4F2F8] hover:border-[#7047FF]/50 transition-colors font-mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="text-xs font-mono hover:bg-[#1C1D25] focus:bg-[#1C1D25] focus:text-[#F4F2F8]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
