import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';

interface Option {
  id: number;
  name: string;
  mobile?: string;
}

interface SelectSearchProps {
  options: Option[];
  value: number | '';
  onChange: (id: number) => void;
  onAddNew?: () => void;
  placeholder: string;
  label: string;
  error?: string;
}

const SelectSearch: React.FC<SelectSearchProps> = ({
  options,
  value,
  onChange,
  onAddNew,
  placeholder,
  label,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected option
  const selectedOption = options.find(opt => opt.id === value);

  // Set initial search value to the name of selected option
  useEffect(() => {
    if (selectedOption) {
      setSearch(selectedOption.name);
    } else {
      setSearch('');
    }
  }, [value, selectedOption]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to selected name if open is closed
        setSearch(selectedOption ? selectedOption.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase()) ||
    (opt.mobile && opt.mobile.includes(search))
  );

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setSearch(option.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full z-30">
      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-[#09090b] border ${
            error 
              ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' 
              : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20 focus:border-indigo-500'
          } rounded-xl pl-10 pr-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-4 transition-all`}
        />
        
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </div>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {error && (
        <span className="block mt-1 text-xs text-rose-500 font-medium">
          {error}
        </span>
      )}

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-scale-in">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex justify-between items-center ${
                    value === opt.id ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>{opt.name}</span>
                  {opt.mobile && <span className="text-xs text-zinc-400 dark:text-zinc-500">{opt.mobile}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No results found.
            </div>
          )}

          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNew();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-zinc-50 dark:bg-[#16161c] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border-t border-zinc-150 dark:border-zinc-800 text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectSearch;
