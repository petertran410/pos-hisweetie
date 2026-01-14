import { useState, useCallback } from "react";

export const useFormattedNumber = (initialValue: number = 0) => {
  const [value, setValue] = useState<number>(initialValue);
  const [displayValue, setDisplayValue] = useState<string>(
    initialValue > 0 ? initialValue.toLocaleString("en-US") : ""
  );

  const formatNumber = useCallback((num: number): string => {
    if (!num || num === 0) return "";
    return num.toLocaleString("en-US");
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const onlyNumbers = inputValue.replace(/[^\d]/g, "");

      if (onlyNumbers === "") {
        setDisplayValue("");
        setValue(0);
        return;
      }

      const numericValue = parseInt(onlyNumbers, 10);
      setValue(numericValue);
      setDisplayValue(formatNumber(numericValue));
    },
    [formatNumber]
  );

  const handleBlur = useCallback(() => {
    if (value === 0) {
      setDisplayValue("");
    }
  }, [value]);

  const reset = useCallback(
    (newValue: number = 0) => {
      setValue(newValue);
      setDisplayValue(newValue > 0 ? formatNumber(newValue) : "");
    },
    [formatNumber]
  );

  return {
    value,
    displayValue,
    handleChange,
    handleBlur,
    reset,
    setValue,
    setDisplayValue,
  };
};
