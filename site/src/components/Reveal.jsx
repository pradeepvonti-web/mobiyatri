import React from 'react';
import { motion } from 'framer-motion';

export default function Reveal({ children, delay = 0, y = 28, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: .6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}>
      {children}
    </motion.div>
  );
}

export function Stagger({ children, gap = .09, ...rest }) {
  return (
    <motion.div
      initial="hide" whileInView="show" viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
      {...rest}>
      {children}
    </motion.div>
  );
}

export const item = {
  hide: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: .55, ease: [0.22, 1, 0.36, 1] } }
};
