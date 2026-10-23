-- Runs once, when the Docker volume is first created.
-- nowaste is the development database; nowaste_test is used only by the automated tests.
CREATE DATABASE nowaste_test OWNER nowaste;
