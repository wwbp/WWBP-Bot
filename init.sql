-- Drop the user if exists
DROP USER IF EXISTS 'user'@'%';

-- Create the user specifying the authentication plugin
CREATE USER 'user'@'%' IDENTIFIED WITH mysql_native_password BY 'AnotherStrongPassword123!';

-- Grant privileges to the user on all databases
GRANT ALL PRIVILEGES ON *.* TO 'user'@'%' WITH GRANT OPTION;

-- Flush privileges to ensure they are loaded
FLUSH PRIVILEGES;
