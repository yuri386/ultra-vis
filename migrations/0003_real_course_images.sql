UPDATE lectures SET image = '/assets/images/lectures/lecture-programming-v1.png' WHERE category = 'Programming';
UPDATE lectures SET image = '/assets/images/lectures/lecture-science-v1.png' WHERE category IN ('Mathematics', 'Physics', 'Biology', 'Chemistry');
UPDATE lectures SET image = '/assets/images/ultravis-hero-v2.png' WHERE category IN ('Economics', 'History', 'Languages', 'Philosophy');
UPDATE colleges SET image = '/assets/images/ultravis-hero-v2.png';
