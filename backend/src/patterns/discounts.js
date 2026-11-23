class Discount {
  constructor() {
    if (new.target === Discount) throw new TypeError('Choose a concrete discount strategy.');
  }
  calculate() { throw new Error('A discount strategy must calculate a discount.'); }
  validate() { throw new Error('A discount strategy must validate its value.'); }
}

class PercentageDiscount extends Discount {
  validate(value) { return Number.isInteger(value) && value > 0 && value <= 100; }
  calculate(subtotal, percent) { return Math.floor(subtotal * percent / 100); }
}

class FixedDiscount extends Discount {
  validate(value) { return Number.isInteger(value) && value > 0; }
  calculate(subtotal, cents) { return Math.min(subtotal, cents); }
}

export function createDiscount(kind) {
  switch (kind) {
    case 'percent': return new PercentageDiscount();
    case 'fixed': return new FixedDiscount();
    default: throw new TypeError('Unknown discount strategy.');
  }
}
