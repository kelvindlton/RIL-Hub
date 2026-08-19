-- SEED HUB LOCATIONS
INSERT INTO public.hub_locations (id, name, latitude, longitude, radius_m)
VALUES 
    ('ril-main', 'RIL Innovation Hub', 6.5244000, 3.3792000, 150),
    ('ril-dallas', 'RIL Dallas Hub', 32.7767000, -96.7970000, 200)
ON CONFLICT (id) DO NOTHING;

-- SEED INITIAL EVENTS
INSERT INTO public.events (id, title, description, location, date, time, category, max_capacity, qr_code_hash)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Fullstack Bootcamp Graduation Ceremony',
        'Celebrating the graduation of the class of 2025! Come see the amazing capstone project presentations in software engineering, embedded systems, and tech business models.',
        'RIL Innovation Hall, Port Harcourt Hub',
        '2026-06-12',
        '14:00 - 18:00',
        'program',
        60,
        'qr_ril_bootcamp_grad_2026'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'RIL AI Research Summit 2026',
        'A 2-day technical summit bringing AI practitioners, machine learning engineers, and researchers together from Dallas and Nigeria to discuss edge-computing, LLM tuning, and robotics.',
        'Hybrid (RIL Dallas Hub & Zoom)',
        '2026-05-30',
        '10:00 - 16:00',
        'workshop',
        150,
        'qr_ril_ai_summit_2026'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Port Harcourt Smart City IoT Hackathon',
        '36 hours of hacking! Design and build physical hardware solutions answering waste disposal, traffic congestion, and local solar-energy grid distribution problems.',
        'IoT Sandbox & Lab, Port Harcourt',
        '2026-06-25',
        '08:00 (Fri) - 20:00 (Sat)',
        'hackathon',
        40,
        'qr_ril_iot_hackathon_2026'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'RIL Community Hangout & Games Night',
        'Unwind and connect! An evening of console games, board games, local finger food, networking, and celebrating monthly birthdays across the RIL Family.',
        'Courtyard Terrace, Port Harcourt Hub',
        '2026-05-29',
        '17:00 - 21:00',
        'social',
        75,
        'qr_ril_mingle_may_2026'
    )
ON CONFLICT (id) DO NOTHING;
