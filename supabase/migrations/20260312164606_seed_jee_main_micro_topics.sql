-- Seed JEE Main 2026 (BE/BTech) syllabus at unit level into micro_topics.
-- This assumes micro_topics already has:
--   topic_name (unique), subject, target_exam (NOT NULL), topic (description), weightage, difficulty.

insert into micro_topics (topic_name, subject, target_exam, topic, weightage, difficulty)
values
  -- MATHEMATICS
  ('Sets, Relations and Functions (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 1: Sets, relations, functions; power set; composition', 5, 2),
  ('Complex Numbers and Quadratic Equations (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 2: Complex numbers in Argand plane; quadratic equations; roots and coefficients', 6, 3),
  ('Matrices and Determinants (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 3: Matrices, determinants, inverse and linear systems', 6, 3),
  ('Permutations and Combinations (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 4: Fundamental counting principle, P(n,r), C(n,r)', 4, 2),
  ('Binomial Theorem (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 5: Binomial theorem, general and middle terms', 4, 2),
  ('Sequence and Series (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 6: AP, GP, means, relation between A.M and G.M', 5, 2),
  ('Limits, Continuity and Differentiability (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 7: Limits, continuity, derivatives and applications (rate, maxima/minima)', 7, 4),
  ('Integral Calculus (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 8: Indefinite and definite integrals, areas under curves', 7, 4),
  ('Differential Equations (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 9: First-order ODEs, separation of variables, linear form', 5, 3),
  ('Coordinate Geometry (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 10: Straight lines, circles, conics in 2D', 7, 3),
  ('Three Dimensional Geometry (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 11: 3D coordinates, lines, skew lines and distances', 6, 3),
  ('Vector Algebra (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 12: Vectors, components, dot and cross product', 5, 3),
  ('Statistics and Probability (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 13: Measures of dispersion, probability, Bayes theorem', 5, 3),
  ('Trigonometry (JEE)', 'Mathematics', 'JEE_MAIN', 'UNIT 14: Trig identities, functions and inverses', 5, 3),

  -- PHYSICS (JEE Main – very similar to NEET but tagged separately)
  ('Units and Measurements (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 1: Units, dimensions, significant figures, errors', 4, 2),
  ('Kinematics (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 2: 1D/2D motion, projectile, relative, circular motion', 5, 3),
  ('Laws of Motion (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 3: Newton''s laws, friction, circular motion applications', 6, 3),
  ('Work, Energy and Power (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 4: Work-energy theorem, conservative vs non-conservative', 6, 3),
  ('Rotational Motion (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 5: Torque, angular momentum, moment of inertia, rigid body', 6, 4),
  ('Gravitation (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 6: Universal gravitation, satellites, escape velocity', 5, 3),
  ('Properties of Solids and Liquids (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 7: Elasticity, viscosity, surface tension, heat transfer', 4, 3),
  ('Thermodynamics (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 8: Laws of thermodynamics, processes, heat and work', 5, 3),
  ('Kinetic Theory of Gases (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 9: Kinetic theory, gas laws, equipartition, DoF', 4, 2),
  ('Oscillations and Waves (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 10: SHM, pendulum, waves, beats, standing waves', 6, 3),
  ('Electrostatics (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 11: Charges, fields, Gauss law, potential, capacitors', 7, 4),
  ('Current Electricity (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 12: Ohm''s law, circuits, cells, Kirchhoff, bridges', 7, 3),
  ('Magnetic Effects and Magnetism (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 13: Biot–Savart, Ampere, forces, dipoles, materials', 7, 4),
  ('Electromagnetic Induction and AC (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 14: Faraday, Lenz, inductance, AC circuits, transformers', 7, 4),
  ('Electromagnetic Waves (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 15: EM waves, spectrum and uses', 4, 2),
  ('Optics (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 16: Geometrical and wave optics, instruments', 8, 4),
  ('Dual Nature of Matter and Radiation (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 17: Photoelectric effect, de Broglie waves', 4, 3),
  ('Atoms and Nuclei (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 18: Atomic models, nuclear structure and energy', 5, 3),
  ('Electronic Devices (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 19: Semiconductors, diodes, logic gates', 4, 3),
  ('Experimental Skills (JEE)', 'Physics', 'JEE_MAIN', 'UNIT 20: Standard lab experiments and measurements', 3, 2),

  -- CHEMISTRY (JEE Main)
  ('Some Basic Concepts of Chemistry (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 1: Mole concept, stoichiometry, laws of combination', 5, 2),
  ('Atomic Structure (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 2: Bohr model, quantum mechanics basics, configuration', 6, 3),
  ('Chemical Bonding and Molecular Structure (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 3: VBT, MOT, VSEPR, hybridization, resonance', 7, 4),
  ('Chemical Thermodynamics (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 4: First & second law, enthalpy, Gibbs energy', 6, 3),
  ('Solutions (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 5: Concentration, Raoult, colligative properties, van’t Hoff', 5, 3),
  ('Equilibrium (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 6: Chemical & ionic equilibrium, Le Chatelier, buffers', 7, 4),
  ('Redox Reactions and Electrochemistry (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 7: Redox, conductance, electrochemical cells, Nernst', 6, 3),
  ('Chemical Kinetics (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 8: Rate laws, order, Arrhenius, collision theory', 5, 3),
  ('Classification of Elements and Periodicity (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 9: Periodic trends, periodic table blocks', 5, 2),
  ('p-Block Elements (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 10: Groups 13–18, trends and important compounds', 6, 3),
  ('d- and f-Block Elements (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 11: Transition & inner transition elements', 5, 3),
  ('Coordination Compounds (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 12: Werner theory, nomenclature, isomerism', 5, 3),
  ('Purification and Characterisation of Organic Compounds (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 13: Purification and analysis of organics', 4, 2),
  ('Basic Principles of Organic Chemistry (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 14: Hybridization, electronic effects, mechanisms, isomerism', 6, 3),
  ('Hydrocarbons (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 15: Alkanes, alkenes, alkynes, aromatics', 6, 3),
  ('Organic Compounds Containing Halogens (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 16: Haloalkanes and haloarenes', 4, 3),
  ('Organic Compounds Containing Oxygen (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 17: Alcohols, phenols, ethers, carbonyls, acids', 7, 4),
  ('Organic Compounds Containing Nitrogen (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 18: Amines and diazonium salts', 5, 3),
  ('Biomolecules (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 19: Carbohydrates, proteins, nucleic acids, vitamins, hormones', 5, 2),
  ('Principles Related to Practical Chemistry (JEE)', 'Chemistry', 'JEE_MAIN', 'UNIT 20: Qualitative and quantitative experiments', 3, 2);

