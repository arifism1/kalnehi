-- Ensure micro_topics has the columns expected by the Kalnehi engines
-- and seed NEET (UG) 2026 syllabus at unit level.

alter table if exists micro_topics
  add column if not exists subject text,
  add column if not exists topic text,
  add column if not exists weightage integer,
  add column if not exists difficulty integer;

insert into micro_topics (subject, topic_name, topic, weightage, difficulty, target_exam)
values
  -- PHYSICS
  ('Physics', 'Physics and Measurement', 'UNIT 1: Physics and Measurement – Units, dimensions, errors, significant figures', 4, 2, 'NEET'),
  ('Physics', 'Kinematics', 'UNIT 2: Kinematics – 1D/2D motion, projectile, relative, circular motion', 5, 3, 'NEET'),
  ('Physics', 'Laws of Motion', 'UNIT 3: Laws of Motion – Newton''s laws, friction, circular motion applications', 6, 3, 'NEET'),
  ('Physics', 'Work, Energy and Power', 'UNIT 4: Work, Energy and Power – work-energy theorem, conservative vs non-conservative forces', 6, 3, 'NEET'),
  ('Physics', 'Rotational Motion', 'UNIT 5: Rotational Motion – torque, angular momentum, moment of inertia, rigid body rotation', 6, 4, 'NEET'),
  ('Physics', 'Gravitation', 'UNIT 6: Gravitation – universal law, satellites, escape velocity, gravitational potential', 5, 3, 'NEET'),
  ('Physics', 'Properties of Solids and Liquids', 'UNIT 7: Properties of Solids and Liquids – elasticity, viscosity, surface tension, heat transfer', 4, 3, 'NEET'),
  ('Physics', 'Thermodynamics', 'UNIT 8: Thermodynamics – laws, processes, heat and work', 5, 3, 'NEET'),
  ('Physics', 'Kinetic Theory of Gases', 'UNIT 9: Kinetic Theory of Gases – equation of state, kinetic interpretation, degrees of freedom', 4, 2, 'NEET'),
  ('Physics', 'Oscillations and Waves', 'UNIT 10: Oscillations and Waves – SHM, simple pendulum, waves, beats, standing waves', 6, 3, 'NEET'),
  ('Physics', 'Electrostatics', 'UNIT 11: Electrostatics – charges, field, potential, Gauss law, capacitors', 7, 4, 'NEET'),
  ('Physics', 'Current Electricity', 'UNIT 12: Current Electricity – Ohm''s law, resistivity, circuits, Kirchoff, Wheatstone, cells', 7, 3, 'NEET'),
  ('Physics', 'Magnetic Effects of Current and Magnetism', 'UNIT 13: Magnetic Effects and Magnetism – Biot–Savart, Ampere, force on charges and currents, magnetism', 7, 4, 'NEET'),
  ('Physics', 'Electromagnetic Induction and AC', 'UNIT 14: EM Induction and AC – Faraday, Lenz, inductance, AC circuits, resonance, transformers', 7, 4, 'NEET'),
  ('Physics', 'Electromagnetic Waves', 'UNIT 15: Electromagnetic Waves – displacement current, EM spectrum, properties and uses', 4, 2, 'NEET'),
  ('Physics', 'Optics', 'UNIT 16: Optics – geometrical and wave optics, reflection, refraction, interference, diffraction, polarization', 8, 4, 'NEET'),
  ('Physics', 'Dual Nature of Matter and Radiation', 'UNIT 17: Dual Nature of Matter and Radiation – photoelectric effect, de Broglie waves', 4, 3, 'NEET'),
  ('Physics', 'Atoms and Nuclei', 'UNIT 18: Atoms and Nuclei – Bohr model, spectra, nuclear binding energy, fission, fusion', 5, 3, 'NEET'),
  ('Physics', 'Electronic Devices', 'UNIT 19: Electronic Devices – semiconductors, diodes, logic gates', 4, 3, 'NEET'),
  ('Physics', 'Experimental Skills', 'UNIT 20: Experimental Skills – measurement and basic lab experiments', 3, 2, 'NEET'),

  -- CHEMISTRY: Physical
  ('Chemistry', 'Some Basic Concepts of Chemistry', 'UNIT 1: Some Basic Concepts of Chemistry – mole concept, stoichiometry, laws of combination', 5, 2, 'NEET'),
  ('Chemistry', 'Atomic Structure', 'UNIT 2: Atomic Structure – Bohr model, quantum numbers, orbitals, configuration', 6, 3, 'NEET'),
  ('Chemistry', 'Chemical Bonding and Molecular Structure', 'UNIT 3: Chemical Bonding and Molecular Structure – VBT, MOT, VSEPR, hybridization, H-bonding', 7, 4, 'NEET'),
  ('Chemistry', 'Chemical Thermodynamics', 'UNIT 4: Chemical Thermodynamics – first & second law, enthalpy, Gibbs, spontaneity', 6, 3, 'NEET'),
  ('Chemistry', 'Solutions', 'UNIT 5: Solutions – concentration units, Raoult, colligative properties, van’t Hoff factor', 5, 3, 'NEET'),
  ('Chemistry', 'Equilibrium', 'UNIT 6: Equilibrium – chemical & ionic equilibrium, Le Chatelier, buffers, solubility', 7, 4, 'NEET'),
  ('Chemistry', 'Redox Reactions and Electrochemistry', 'UNIT 7: Redox Reactions and Electrochemistry – redox, conductance, cells, Nernst', 6, 3, 'NEET'),
  ('Chemistry', 'Chemical Kinetics', 'UNIT 8: Chemical Kinetics – rate laws, order, half-life, Arrhenius, collision theory', 5, 3, 'NEET'),

  -- CHEMISTRY: Inorganic
  ('Chemistry', 'Classification of Elements and Periodicity', 'UNIT 9: Classification of Elements and Periodicity – periodic trends and blocks', 5, 2, 'NEET'),
  ('Chemistry', 'p-Block Elements', 'UNIT 10: p-Block Elements – groups 13–18 trends and important compounds', 6, 3, 'NEET'),
  ('Chemistry', 'd- and f-Block Elements', 'UNIT 11: d- and f-Block Elements – transition & inner transition trends', 5, 3, 'NEET'),
  ('Chemistry', 'Coordination Compounds', 'UNIT 12: Coordination Compounds – Werner theory, nomenclature, isomerism', 5, 3, 'NEET'),

  -- CHEMISTRY: Organic
  ('Chemistry', 'Purification and Characterisation of Organic Compounds', 'UNIT 13: Purification and Characterisation of Organic Compounds – purification and analysis', 4, 2, 'NEET'),
  ('Chemistry', 'Basic Principles of Organic Chemistry', 'UNIT 14: Basic Principles of Organic Chemistry – hybridization, electronic effects, mechanisms, isomerism', 6, 3, 'NEET'),
  ('Chemistry', 'Hydrocarbons', 'UNIT 15: Hydrocarbons – alkanes, alkenes, alkynes, aromatics', 6, 3, 'NEET'),
  ('Chemistry', 'Organic Compounds Containing Halogens', 'UNIT 16: Organic Compounds Containing Halogens – haloalkanes and haloarenes', 4, 3, 'NEET'),
  ('Chemistry', 'Organic Compounds Containing Oxygen', 'UNIT 17: Organic Compounds Containing Oxygen – alcohols, phenols, ethers, carbonyls, acids', 7, 4, 'NEET'),
  ('Chemistry', 'Organic Compounds Containing Nitrogen', 'UNIT 18: Organic Compounds Containing Nitrogen – amines and diazonium salts', 5, 3, 'NEET'),
  ('Chemistry', 'Biomolecules', 'UNIT 19: Biomolecules – carbohydrates, proteins, nucleic acids, vitamins, hormones', 5, 2, 'NEET'),
  ('Chemistry', 'Principles Related to Practical Chemistry', 'UNIT 20: Principles Related to Practical Chemistry – qualitative and quantitative experiments', 3, 2, 'NEET'),

  -- BIOLOGY
  ('Biology', 'Diversity in Living World', 'UNIT 1: Diversity in Living World – classification, kingdoms, plant & animal diversity', 6, 3, 'NEET'),
  ('Biology', 'Structural Organisation in Animals and Plants', 'UNIT 2: Structural Organisation in Animals and Plants – morphology, anatomy, tissues', 5, 3, 'NEET'),
  ('Biology', 'Cell Structure and Function', 'UNIT 3: Cell Structure and Function – cell theory, organelles, biomolecules, division', 6, 3, 'NEET'),
  ('Biology', 'Plant Physiology', 'UNIT 4: Plant Physiology – photosynthesis, respiration, growth and regulators', 6, 3, 'NEET'),
  ('Biology', 'Human Physiology', 'UNIT 5: Human Physiology – breathing, circulation, excretion, locomotion, neural, endocrine', 8, 4, 'NEET'),
  ('Biology', 'Reproduction', 'UNIT 6: Reproduction – plants, humans, reproductive health', 6, 3, 'NEET'),
  ('Biology', 'Genetics and Evolution', 'UNIT 7: Genetics and Evolution – Mendelian genetics, molecular basis, evolution, H-W', 7, 4, 'NEET'),
  ('Biology', 'Biology and Human Welfare', 'UNIT 8: Biology and Human Welfare – diseases, immunity, drugs, microbes', 5, 3, 'NEET'),
  ('Biology', 'Biotechnology and Its Applications', 'UNIT 9: Biotechnology and Its Applications – genetic engineering, GMOs, therapy', 5, 3, 'NEET'),
  ('Biology', 'Ecology and Environment', 'UNIT 10: Ecology and Environment – populations, ecosystems, biodiversity, conservation', 6, 3, 'NEET');

