import { motion } from 'framer-motion';
import React from 'react';

/**
 * A responsive hero component with a fade-in animation.
 */
export const Hero: React.FC = () => (
  <motion.section
    className="flex flex-col items-center justify-center text-center p-8 md:p-16"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.6 }}
  >
    <h1 className="text-4xl md:text-6xl font-bold mb-4">
      Welcome to Our Site
    </h1>
    <p className="text-lg md:text-2xl max-w-2xl">
      Build something amazing with Tailwind CSS and Framer Motion.
    </p>
  </motion.section>
);

export default Hero;
