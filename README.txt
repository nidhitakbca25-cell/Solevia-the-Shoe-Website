# SOLEVIA — XAMPP + PHP + MySQL Backend

This project keeps the original Solevia red/pink visual theme and connects it to a real PHP/MySQL backend.

## 1. Requirements
- XAMPP (Apache + MySQL)
- A browser (Chrome/Edge)
- Windows is easiest for this setup.

## 2. Put the project in XAMPP
Copy the entire `solevia_xampp` folder to:

C:\xampp\htdocs\solevia_xampp

Final important file:
C:\xampp\htdocs\solevia_xampp\index.html

## 3. Start XAMPP
Open XAMPP Control Panel.

Click:
- Start Apache
- Start MySQL

Both should show as running.

## 4. Create the database
Open:

http://localhost/phpmyadmin

Then:
1. Click `Import`.
2. Select `database.sql` from this project.
3. Click `Go`.
4. You should see database `solevia_db`.
5. Open `solevia_db` and verify these tables:
   - users
   - products
   - cart_items
   - wishlist
   - orders
   - order_items
   - contact_messages

The SQL also inserts the six products used by the website.

## 5. Run the website
Open:

http://localhost/solevia_xampp/index.html

Do NOT open index.html by double-clicking it from File Explorer. PHP APIs need Apache, so always use the localhost URL.

## 6. Teacher demonstration flow
Use this exact flow:

A. Click `Sign Up`
   - Enter name, email, password.
   - The account is inserted into `users`.
   - The user is automatically logged in.

B. Click `Add to Cart`
   - The cart is stored in `cart_items` for the logged-in user.

C. Open cart
   - Increase/decrease quantity.
   - Click `Place Order`.
   - Enter name, phone, address and payment method.
   - Order is stored in:
       orders
       order_items
   - Cart rows are cleared after successful order.

D. Go to Contact Us
   - Enter all fields.
   - Click `Send Message`.
   - Message is stored in `contact_messages`.

E. Click the user/logout controls
   - Logout destroys the PHP session.
   - Login again with the same credentials.
   - The account is retrieved from MySQL.

F. After login, open:
   http://localhost/solevia_xampp/dashboard.php
   This shows the logged-in user's account, orders and contact messages saved in MySQL.

G. To show the database directly:
   http://localhost/phpmyadmin
   → solevia_db
   → select `users`, `orders`, `order_items`, `contact_messages`, etc.

## 7. If MySQL has a password
Default XAMPP usually has:
username = root
password = empty

If your MySQL root account has a password, open `config.php` and change:

$DB_USER = "root";
$DB_PASS = "YOUR_PASSWORD";

Do not change `$DB_NAME` unless you also change the SQL database name.

## 8. What is actually stored
- Signup: name, email, password hash, created time
- Login: checked against the password hash
- Cart: user, product, quantity
- Wishlist: user and product
- Order: customer details, address, payment method, total, status, date
- Order items: exact products, quantity and price
- Contact: name, email, subject, message, user link and date

Passwords are NEVER stored as plain text. PHP's `password_hash()` and `password_verify()` are used.

## 9. Important troubleshooting
### "Database connection failed"
- Start MySQL in XAMPP.
- Import `database.sql`.
- Check `config.php` credentials.

### "404 / api.php not found"
The project is not inside:
C:\xampp\htdocs\solevia_xampp

Make sure `api.php` is in the same folder as `index.html`.

### Page opens but login does nothing
Use:
http://localhost/solevia_xampp/index.html

Do not use:
file:///C:/xampp/htdocs/...

### Port 80 is busy
If Apache uses another port such as 8080, use:
http://localhost:8080/solevia_xampp/index.html

### MySQL port is changed
If MySQL is not using 3306, update the PDO host in `config.php`, for example:
mysql:host=127.0.0.1;port=3307;dbname=solevia_db;charset=utf8mb4

## 10. Security notes for a college/demo project
- Prepared PDO statements are used.
- Passwords are hashed.
- PHP sessions handle login state.
- HTML output in the dashboard is escaped.
- This is suitable for a local academic/demo setup. For a production store, HTTPS, CSRF protection, email verification, stronger authorization and payment-provider integration should be added.
