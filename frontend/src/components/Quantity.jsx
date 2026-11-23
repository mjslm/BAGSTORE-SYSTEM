import Icon from './Icon.jsx';

export default function Quantity({ value, min = 1, max, onChange, disabled, label }) {
  return <div className="quantity" role="group" aria-label={label}>
    <button type="button" aria-label={'Decrease ' + label} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} /></button>
    <output aria-label={label}>{value}</output>
    <button type="button" aria-label={'Increase ' + label} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
  </div>;
}
