PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO documents (id, ref, citation, title, type, status, date_introduced, date_concluded, sponsor, ministry, session, summary, content, published)
VALUES
(1, 'ACT-2026-009', '2026 c. 9', 'National Energy Security Act 2026', 'Act', 'In force', '2026-03-12', '2026-06-28', 'Minister for State Administration', 'State Administration', '2026', 'Establishes a national framework for energy supply resilience and creates the Office of Energy Security.', 'Part 1 — Preliminary\n1. This Act may be cited as the National Energy Security Act 2026.\n2. This Act comes into force on the date of presidential assent.\n\nPart 2 — Office of Energy Security\n3. There is established an Office of Energy Security.', 1),
(2, 'BL-2026-021', '', 'Coastal Fisheries Protection Bill', 'Bill', 'Under debate', '2026-07-03', '', 'Minister for Natural Resources', 'Natural Resources', '2026', 'Introduces licensing controls and seasonal quotas for coastal fishing fleets.', 'A Bill to protect coastal fish stocks and regulate commercial fishing activity.', 1),
(3, 'MOT-2026-031', '', 'Motion on Regional Transport Funding', 'Motion', 'Passed', '2026-07-01', '2026-07-01', 'Member for Harrow District', 'Transport', '2026', 'Calls on the Ministry of Transport to ring-fence additional funding for regional rail links.', 'That this Parliament calls upon the Government to provide additional protected funding for regional rail links.', 1);

INSERT OR IGNORE INTO document_stages (id, document_id, label, stage_date, completed, sort_order) VALUES
(1,1,'Introduced','2026-03-12',1,1),(2,1,'First reading','2026-03-12',1,2),(3,1,'Committee','2026-05-01',1,3),(4,1,'Final vote','2026-06-25',1,4),(5,1,'Presidential assent','2026-06-28',1,5),
(6,2,'Introduced','2026-07-03',1,1),(7,2,'First reading','2026-07-03',1,2),(8,2,'Committee','',0,3);

INSERT OR IGNORE INTO members (id, name, title, constituency, party, affiliation, biography, active) VALUES
(1,'A. Harrow','Member of Parliament','Harrow District','Blue Progressive Party','Government','Represents Harrow District and focuses on transport and regional development.',1),
(2,'S. Southport','Member of Parliament','Southport','Blue Progressive Party','Government','Represents Southport and focuses on coastal policy.',1),
(3,'E. Eastbrook','Member of Parliament','Eastbrook','Blue Sovereignty Party','Opposition','Opposition member for Eastbrook.',1),
(4,'N. Northgate','Member of Parliament','Northgate','National Fox Front','Opposition','Represents Northgate.',1),
(5,'W. Willowmere','Member of Parliament','Willowmere','Independent','Independent','Independent member for Willowmere.',1);

INSERT OR IGNORE INTO votes (id, document_id, vote_date, vote_type, majority_rule, result_override, notes) VALUES
(1,1,'2026-06-25','Final vote','simple','','Final parliamentary vote.'),
(2,3,'2026-07-01','Motion','simple','','');

INSERT OR IGNORE INTO vote_choices (vote_id, member_id, choice) VALUES
(1,1,'For'),(1,2,'For'),(1,3,'Against'),(1,4,'Against'),(1,5,'Abstain'),
(2,1,'For'),(2,2,'For'),(2,3,'Against'),(2,4,'Absent'),(2,5,'For');
