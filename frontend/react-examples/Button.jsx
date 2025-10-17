import React from 'react';
import PropTypes from 'prop-types';

const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60';

const variants = {
  danger: 'bg-rose-700 hover:bg-rose-600 text-white focus:ring-rose-400',
  amber: 'bg-amber-700 hover:bg-amber-600 text-white focus:ring-amber-300',
  primary: 'bg-sky-700 hover:bg-sky-600 text-white focus:ring-sky-300',
  ghost: 'bg-transparent border border-slate-600 text-slate-200 hover:bg-slate-700/30 focus:ring-slate-400'
};

export default function Button({ children, variant = 'primary', onClick, className = '', ...props }) {
  const v = variants[variant] || variants.primary;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[base, v, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['danger', 'amber', 'primary', 'ghost']),
  onClick: PropTypes.func,
  className: PropTypes.string
};
