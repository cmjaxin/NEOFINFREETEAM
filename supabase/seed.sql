-- Seed script: import roster.json employees
-- Run AFTER schema.sql and after creating Colin's auth user + profile

-- Step 1: Create Colin's auth user via Supabase Dashboard > Authentication > Users
--   Email: colin.jenson@neohomeloans.com
--   Set a secure password
--   Copy the UUID

-- Step 2: Insert Colin's profile (replace <COLIN_UUID> with the actual UUID from step 1)
-- insert into profiles (id, full_name, email, title, role, status)
-- values ('<COLIN_UUID>', 'Colin Jenson', 'colin.jenson@neohomeloans.com', 'Marketing Manager', 'admin', 'approved')
-- on conflict (id) do nothing;

-- Step 3: Seed employees from roster.json
-- This inserts all 63 employees. Paste into Supabase SQL editor.

insert into employees (name, onboarding_role, status, title, team, work_email, personal_email, phone, address, dob, termination_date) values
('Aaron Thomas','MA','active','Mortgage Advisor/ Branch Leader','Team Thomas','aaron.thomas@neohomeloans.com','aaronmthomas81@gmail.com','830-613-7337','1170 Stone Forest Trl Round Rock, TX 78681','1993-06-18',null),
('Andrew Vass','MA','active','Marketing Coordinator','Team Mettle','andrew.vass@neohomeloans.com','ajvass1@gmail.com','801-995-2724','1605 Preston Road Alexandria, VA 22302','1992-09-28',null),
('Anthony Alfonso-Soto','MA','active','Mortgage Advisor','Team DiGregorio','anthony@teamfq.com',null,'+1 702-675-0487','5226 4th St W Lehigh Acres, FL 33971',null,null),
('Ashely Roberts','MA','active','Mortgage Advisor','Team Condie','ashley.roberts@neohomeloans.com',null,'512-963-9929','1202 Parkway St. Georgetown, TX 78628',null,null),
('Barbara Phillips','PP','active','Production Concierge Team Lead','FinFree Division','barbara.phillips@neohomeloans.com','barbarap0621@gmail.com','805-304-7859','192 Green Bay Dr Boardman, OH 44512','1975-06-21',null),
('Ben (Benjamin) Kyle','MA','active','Mortgage Advisor','Team Mettle','ben.kyle@neohomeloans.com','duncangmal@gmail.com','415-341-3393','4512 S Leo Way Salt Lake City, UT 84117','1967-08-01',null),
('Bryon Wensel','MA','active','Mortgage Advisor','Team Mettle','bryon.wensel@neohomeloans.com','bryonwensel@gmail.com','801-703-4677','4775 W 4985 S Salt Lake City, UT 84118','1992-04-22',null),
('Colin Jenson','MA','active','Marketing Manager','FinFree Division','colin.jenson@neohomeloans.com','cmjaxin@gmail.com','801-671-1032','14277 Copper Oaks Drive Herriman, UT 84096','1993-08-11',null),
('Cynthia Leal','LSCA','active','Loan Specialist','Team Mettle','cynthia.leal@neohomeloans.com','cynthia_leal@ymail.com','805-279-2901','6032 Fallbrook Ave Woodland Hills, CA 91367','1971-09-15',null),
('David Nelson','MA','active','Mortgage Advisor','Team Mettle','david.nelson@neohomeloans.com','david.utahloans@gmail.com','801-699-9148','1992 E 9800 S Sandy, UT 84092','1981-03-16',null),
('Drake Bloebaum','MA','active','Mortgage Advisor','Team Mettle','drake.bloebaum@neohomeloans.com','drakebloebaum@gmail.com','801-633-1167','3142 East Millcreek Dell Lane SLC, UT 84109','1978-01-04',null),
('Edgardo Ballentine','MA','active','Mortgage Advisor','Team DiGregorio','edgardo@teamfq.com',null,'239-244-5871','26975 Piva Court',null,null),
('Emily Summers','PP','active','Production Partner','Team Stable (Allen)','emily.summers@neohomeloans.com','emjsum@icloud.com','937-478-2563','516 David Dr Miamisburg, OH 45342','1975-10-22',null),
('Erica Dresevic','PP','active','Production Partner','Team Padron','erica.dresevic@neohomeloans.com',null,'214-738-9131','2721 Gardendale Dr',null,null),
('Gabrielle Oerter-McLellan','MA','active','Operations Team Lead','Team Mettle','gabrielle.oertermcLellan@neohomeloans.com','goerter@gmail.com','612-518-8062','11808 Elk Head Range Rd Littleton, CO 80127','1961-10-12',null),
('Gavin Laurencelle','LSCA','active','Credit Analyst','Team Condie','gavin.laurencelle@neohomeloans.com','gavinlaurencelle@yahoo.com','810-444-7255','9101 Crofoot Rd Fowlerville, MI 48836','1992-04-16',null),
('Greg (Gregory) Allen','MA','active','Mortgage Advisor/ Branch Leader','Team Stable (Allen)','greg.allen@neohomeloans.com','gaallen1987@gmail.com','937-620-0271','801 Stoneybrook Drive Kettering, OH 45429','1987-08-02',null),
('Heather Mora','LSCA','active','Loan Specialist','Team Padron','heather.mora@neohomeloans.com',null,'949-322-4126','24832 Pointe Trinity Apt L, Dana Point, CA 92629',null,null),
('Jason Drobeck','MA','active','Mortgage Advisor/ Branch Leader','Team Drobeck','jason.drobeck@neohomeloans.com','jason.drobeck@gmail.com','720-436-3356','1880 Angels Landing Kamas, UT 84036','1987-11-13',null),
('Joni Ellis','LSCA','active','Loan Specialist','Team Mettle','joni.ellis@neohomeloans.com','btpellis3@yahoo.com','661-472-5737','1051 Mimosa Dr Morristown, TN 37814','1977-02-03',null),
('Josh Mettle','MA','active','Division President/ Branch Leader','Team Mettle','josh.mettle@neohomeloans.com','josh@joshmettle.com','801-699-4287','2834 E Canyon Gate Rd Park City, UT 84098','1978-06-16',null),
('Jovan Tristan','PP','active','Production Partner','Team Mettle','jovan.tristan@neohomeloans.com','jatristan514@gmail.com','940-305-4775','14024 Gaskin St Pilot Point, TX 76258','1990-01-22',null),
('Justin Padrom','MA','active','Branch Leader/ Mortgage Advisor','Team Padron','Justin.Padron@neohomeloans.com',null,'817-504-8373','2604 Parker Ct, Southlake, TX 76092',null,null),
('Katrinka Condie','MA','active','Mortgage Advisor/ Branch Leader','Team Condie','katrinka@teamkatrinka.com','katrinkacondie@gmail.com','801-995-2206','10514 N Ainsley Way Highland, UT 84003','1977-03-11',null),
('Kaytlin Collins','MA','active','Mortgage Advisor','Team Thomas','kaytlin.collins@neohomeloans.com','kaytlincollins20@gmail.com','936-827-9717','1202 Wofford Dr Burnet, TX 78611','1993-10-22',null),
('Kelly Klein','LSCA','active','Credit Analyst','Team Mettle','klawtonjones@neohomeloans.com','kellylawtonjones@gmail.com','503-991-8901','PO Box 2154 Elizabeth, CO 80107','1995-05-28',null),
('Kelly McGuire','LSCA','active','Credit Analyst','Team Mettle','kelly.mcguire@neohomeloans.com','kellymariemcguire@gmail.com','208-659-9676','8950 N Davis Circle Heyden, ID 83835','1979-09-08',null),
('Kirstin Anderson','LSCA','active','Pipeline Coordinator','Team Mettle','kirstin.anderson@neohomeloans.com','foulke9@gmail.com','916-759-3776','402 W 6th Ave Midvale, UT 84047','1984-08-08',null),
('Kristi ZumBrunnan','PP','active','Production Partner','Team Condie','kristi.zum@neohomeloans.com',null,'720-835-9010','3850 Cragwood Dr Colorado Springs, CO 80907',null,null),
('Kristie (Kristina) Delgado','LSCA','active','Loan Specialist','Team Mettle','kristie.delgado@neohomeloans.com','Kristie_g@hotmail.com','801-712-4277','6127 W Nellies St West Jordan, UT 84081','1988-04-04',null),
('Kylan Krause','PP','active','Production Partner','Team Mettle','kkrause@better.com',null,'509-723-7277','3218 Gonzales Street, Austin, TX 78702',null,null),
('Lily Fleck','PP','active','Production Partner','Team Drobeck','lily.fleck@neohomeloans.com',null,'719-233-5313','112 Sherri Dr Colorado Springs, CO 80911',null,null),
('Liz (Elizabeth) Hedeman','PP','active','Production Partner','Team Thomas','liz.hedeman@neohomeloans.com','lizhedeman@outlook.com','817-480-2920','24860 N US Hwy 281 Stephenville, TX 76401','1985-12-06',null),
('Maria Pineda','LSCA','active','Loan Specialist','Team Mettle','maria.pineda@neohomeloans.com','elena82mp@gmail.com','360-946-7889','21426 NE 249th Ave Battle Ground, WA 98604','1982-08-17',null),
('Marla Small','LSCA','active','Loan Specialist','Team Mettle','marla.small@neohomeloans.com','mowa201438@yahoo.com','812-227-1770','4910 S. Hidden Springs Rd Newberry, IN 47449','1975-12-15',null),
('Matt (Matthew) McNally','MA','active','Mortgage Advisor','Team Mettle','matthew.mcnally@neohomeloans.com','mcnally.matt@yahoo.com','801-386-6418','4297 S Shirley Ln SLC, UT 84124','1978-03-30',null),
('Matt (Matthew) Smith','MA','active','Mortgage Advisor','Team Mettle','matt.smith@neohomeloans.com','mattdsmith44@gmail.com','801-815-7077','3475 S Hunter Point Cir West Valley City, UT 84128','1980-12-19',null),
('Melanie Bowles','PP','active','Production Partner','Team Mettle','melanie.bowles@neohomeloans.com','melaniebowles22@gmail.com','801-244-6171','10345 S Gemmell Club Dr Copperton, UT 84006','1989-11-29',null),
('Michael Hunter','LSCA','active','Pipeline Coordinator','Team Mettle','michael.hunter@neohomeloans.com','michaelhunterrrrr@gmail.com','801-588-9474','3145 South Kenwood Street Salt Lake City 84106','1994-04-07',null),
('(Michael) Scott Breen','MA','active','Mortgage Advisor','Team Mettle','scott.breen@neohomeloans.com','scott@hocteam.com','801-558-5817','3507 E 8740 S Cottonwood Heights, UT 84121','1957-01-01',null),
('Mike (Michael) Jones','MA','active','Mortgage Advisor','Team Mettle','mike.jones@neohomeloans.com','mikejones9963@gmail.com','801-403-3190','11188 S Black Hawk Drive South Jordan, UT 84095','1974-12-31',null),
('Robyn Hawkins','MA','active','Executive Assistant','Team Mettle','robyn.hawkins@neohomeloans.com','robyncpinto@gmail.com','949-220-6264','1428 Komenda Way','1980-12-31',null),
('Ross Zimmerman','MA','active','Mortgage Advisor','Team Mettle','rossz@neohomeloans.com','rosszusu@gmail.com','801-502-3947','2640 W 10950 S South Jordan, UT 84095','1981-04-05',null),
('Scott Digregorio','MA','active','Branch Leader/ Mortgage Advisor','Team DiGregorio','scott@teamfq.com',null,'239-887-0088','11518 Timberline Cir, Fort Myers, FL 34135',null,null),
('Skyler Ford','MA','active','Mortgage Advisor','Team Mettle','skyler.ford@neohomeloans.com','skylerford32@gmail.com','385-377-7550','13652 S. Crimson Patch Way Riverton, UT 84096','1992-10-21',null),
('Tricia Flores','PP','active','Production Partner','Team Padron','tricia.flores@neohomeloans.com',null,'281-639-9304','731 Pickfor Dr. Katy, TX 77450',null,null),
-- Terminated employees
('Sean Antonius','MA','terminated','Mortgage Advisor/ Branch Leader','Team Antonius',null,null,null,null,null,'2025-08-01'),
('Shannon Murphy','PP','terminated','Production Partner','Team Antonius',null,null,null,null,null,'2025-08-01'),
('Nicholas Sudnick','MA','terminated','','',null,null,null,null,null,'2025-08-01'),
('Ben Parish','MA','terminated','','',null,null,null,null,null,'2025-08-05'),
('Cory Bedinghaus','MA','terminated','Mortgage Advisor/ Branch Leader','Team Allen/ Bed',null,null,null,null,null,'2025-09-26'),
('Dustin Schaff','MA','terminated','Mortgage Advisor/ Branch Leader','Team Schaff',null,null,null,null,null,'2025-10-10'),
('Teri Vanderpoel','MA','terminated','Administrative Assistant','Division',null,null,null,null,null,'2025-11-03'),
('Victoria Heinrich','MA','terminated','Mortgage Advisor','Team Allen/ Bed',null,null,null,null,null,'2025-11-14'),
('Melissa Mullins','PP','terminated','Production Partner','Team Drobeck','melissa.mullins@neohomeloans.com','mldrobeck@gmail.com',null,'315 Airstrip Lane Tarrytown, GA 30470','1989-01-22','2025-12-12'),
('Garret Copas','MA','terminated','Mortgage Advisor','Team Allen/ Bed',null,null,null,null,null,'2025-12-29'),
('Colette Singleton','MA','terminated','Mortgage Advisor','Team Mettle',null,null,null,null,null,'2026-01-23'),
('Yama Maher','PP','terminated','Production Partner','Team Condie','yama.maher@neohomeloans.com','ymaher@better.com',null,'2350 E. Alluvial Ave. Fresno, CA 93720','1991-09-27','2026-01-30'),
('Ryan Todey','MA','terminated','Mortgage Advisor/ Branch Leader','Team Todey','ryan.todey@neohomeloans.com','rtodey1@gmail.com',null,'2148 Sentito Circle Henderson, NV 89052','1985-07-25','2026-02-13'),
('Jake Todey','PP','terminated','Production Partner','Team Todey','jake.todey@neohomeloans.com','jake.todey@gmail.com',null,'194 Sandbar Ct Paso Robles, CA 93446','1996-07-02','2026-02-13'),
('Aroura Shipp','PP','terminated','Production Partner','Team Drobeck','aroura.shipp@neohomeloans.com','dancer37@outlook.com',null,'1475 West 2200 South Wellsville, UT 84339','1982-09-10','2026-02-13'),
('Sam (Samuel) Robinson','PP','terminated','Production Partner','Team Mettle','sam.robinson@neohomeloans.com','samrobinson101@gmail.com',null,'10934 Raphi Place South Jordan, UT 84095','1996-07-17','2026-02-25'),
('Kelli West','MA','terminated','Executive Assistant','FinFree Division','kelli.west@neohomeloans.com','kelliwest77@gmail.com','801-792-7583','1219 N 3150 E Layton, UT 84040','1977-03-18','2026-04-01');
