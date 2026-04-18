-- code: language=postgres

-- 1. Insert Courses and capture their IDs
WITH inserted_courses AS (
    INSERT INTO courses (course_name, course_id, professor_name)
    VALUES 
        ('Introduction to Computer Science', 'CS101', 'Dr. Aris Thorne'),
        ('Linear Algebra', 'MATH202', 'Prof. Elena Rodriguez'),
        ('Quantum Mechanics', 'PHYS301', 'Dr. Julian Vane'),
        ('World History: 1900-Present', 'HIST110', 'Dr. Sarah Jenkins')
    RETURNING id, course_id
)

-- 2. Insert Grades using the IDs from the previous step
INSERT INTO grades (id_course, grade, g_status, posted_date)
VALUES
    -- Grades for CS101
    ((SELECT id FROM inserted_courses WHERE course_id = 'CS101'), 850, 'GRADED', NOW() - INTERVAL '2 days'),
    ((SELECT id FROM inserted_courses WHERE course_id = 'CS101'), 920, 'GRADED', NOW() - INTERVAL '1 day'),
    ((SELECT id FROM inserted_courses WHERE course_id = 'CS101'), 0, 'UNGRADED', NOW()),

    -- Grades for MATH202
    ((SELECT id FROM inserted_courses WHERE course_id = 'MATH202'), 740, 'GRADED', NOW() - INTERVAL '5 days'),
    ((SELECT id FROM inserted_courses WHERE course_id = 'MATH202'), 885, 'GRADED', NOW() - INTERVAL '3 days'),

    -- Grades for PHYS301
    ((SELECT id FROM inserted_courses WHERE course_id = 'PHYS301'), 990, 'GRADED', NOW() - INTERVAL '10 hours'),
    ((SELECT id FROM inserted_courses WHERE course_id = 'PHYS301'), 0, 'UNGRADED', NOW() - INTERVAL '1 hour'),

    -- Grades for HIST110
    ((SELECT id FROM inserted_courses WHERE course_id = 'HIST110'), 610, 'GRADED', NOW() - INTERVAL '1 week'),
    ((SELECT id FROM inserted_courses WHERE course_id = 'HIST110'), 775, 'GRADED', NOW() - INTERVAL '4 days');