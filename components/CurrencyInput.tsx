import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

const formatCurrency = (value: number): string => {
  if (isNaN(value) || value === 0) {
    return '';
  }
  // Format to a string with 2 decimal places, but without currency symbol or commas yet for editing
  const fixedValue = value.toFixed(2);
  const [integerPart, decimalPart] = fixedValue.split('.');
  const formattedIntegerPart = new Intl.NumberFormat('en-US').format(parseInt(integerPart, 10));
  return `${formattedIntegerPart}.${decimalPart}`;
};

const parseCurrency = (value: string): number => {
  const numberString = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(numberString);
  return isNaN(parsed) ? 0 : parsed;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, ...rest }) => {
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toString() : '');

  useEffect(() => {
    // Update display value when the prop value changes from outside,
    // but only if it's not the currently edited value, to prevent cursor jumping.
    if (parseCurrency(displayValue) !== value) {
        setDisplayValue(value > 0 ? value.toString() : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (inputValue === '' || inputValue === '$') {
        setDisplayValue('');
        onChange(0);
        return;
    }
    
    // Allow only numbers and a single decimal point
    const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
    if ((sanitizedValue.match(/\./g) || []).length > 2) {
        return; // Prevent more than one decimal point
    }

    setDisplayValue(sanitizedValue);
    
    const numericValue = parseCurrency(sanitizedValue);
    onChange(numericValue);
  };

  const handleBlur = () => {
    const numericValue = parseCurrency(displayValue);
    setDisplayValue(formatCurrency(numericValue));
  };
  
  const handleFocus = () => {
    // On focus, show the raw number for easier editing
    const numericValue = parseCurrency(displayValue);
    setDisplayValue(numericValue > 0 ? String(numericValue) : '');
  }

  return (
    <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-medium pointer-events-none">$</span>
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            {...rest}
            className={`${rest.className} pl-7 text-right`}
        />
    </div>
  );
};
