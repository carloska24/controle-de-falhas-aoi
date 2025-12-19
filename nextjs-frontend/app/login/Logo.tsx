'use client';

import { motion } from 'framer-motion';

export default function Logo() {
  return (
    <div className="logo-svg-container">
      <motion.svg
        id="logo-principal"
        viewBox="0 0 250 260"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[200px] mx-auto mb-2"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Hexágono principal */}
        <motion.path
          className="icon-shape"
          d="M125 10 L235 70 L235 190 L125 250 L15 190 L15 70 Z"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }}
        />
        {/* Código interno */}
        <motion.g
          className="icon-code"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.path
            d="M75 80 L35 130 L75 180"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 1, ease: 'easeInOut' }}
          />
          <motion.path
            d="M150 180 L180 130 L210 180"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 1.2, ease: 'easeInOut' }}
          />
          <motion.line
            x1="135"
            y1="180"
            x2="225"
            y2="80"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 1.4, ease: 'easeInOut' }}
          />
        </motion.g>
      </motion.svg>
      {/* Texto DevNaPratica */}
      <motion.svg
        className="logo-text"
        viewBox="0 0 220 35"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}
      >
        <text x="25" y="27" className="dev-part">
          Dev
        </text>
        <text x="80" y="27" className="pratica-part">
          NaPratica
        </text>
      </motion.svg>
    </div>
  );
}

