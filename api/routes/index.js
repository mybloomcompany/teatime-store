// ===================== Importaciones =====================
const express = require('express');
const router = express.Router();
const { verifyToken, optionalToken, authorizeRole } = require('../middlewares/authMiddleware');

const auth = require('../controllers/authControllers');
const users = require('../controllers/userControllers');
const catalog = require('../controllers/catalogControllers');
const products = require('../controllers/productControllers');
const promotions = require('../controllers/promotionControllers');
const cart = require('../controllers/cartControllers');
const stock = require('../controllers/stockControllers');
const cash = require('../controllers/cashControllers');
const pos = require('../controllers/posControllers');
const orders = require('../controllers/orderControllers');
const reports = require('../controllers/reportControllers');

const admin = [verifyToken, authorizeRole(['administrador'])];
const vendedor = [verifyToken, authorizeRole(['vendedor'])];
const cliente = [verifyToken, authorizeRole(['cliente'])];
const personal = [verifyToken, authorizeRole(['administrador', 'vendedor'])];

// ===================== Autenticación =====================
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', verifyToken, auth.me);
router.patch('/auth/me', verifyToken, auth.updateMe);

// ===================== Usuarios =====================
router.get('/users', admin, users.getUsers);
router.post('/users', admin, users.createUser);
router.get('/users/:id', admin, users.getUser);
router.patch('/users/:id', admin, users.updateUser);
router.patch('/users/:id/status', admin, users.updateUserStatus);

// ===================== Categorías y sabores =====================
router.get('/categories', catalog.getCategories);
router.get('/categories/:id', catalog.getCategory);
router.post('/categories', admin, catalog.createCategory);
router.patch('/categories/:id', admin, catalog.updateCategory);
router.delete('/categories/:id', admin, catalog.deleteCategory);

router.get('/flavors', catalog.getFlavors);
router.post('/flavors', admin, catalog.createFlavor);
router.patch('/flavors/:id', admin, catalog.updateFlavor);
router.delete('/flavors/:id', admin, catalog.deleteFlavor);

// ===================== Productos =====================
router.get('/products', optionalToken, products.getProducts);
router.get('/products/brands', products.getBrands);
router.get('/products/:id', optionalToken, products.getProduct);
router.post('/products', admin, products.createProduct);
router.patch('/products/:id', admin, products.updateProduct);
router.delete('/products/:id', admin, products.deleteProduct);

// ===================== Promociones =====================
router.get('/promotions', optionalToken, promotions.getPromotions);
router.post('/promotions/validate', promotions.validatePromotion);
router.get('/promotions/:id', admin, promotions.getPromotion);
router.post('/promotions', admin, promotions.createPromotion);
router.patch('/promotions/:id', admin, promotions.updatePromotion);
router.delete('/promotions/:id', admin, promotions.deletePromotion);

// ===================== Favoritos y carrito =====================
router.get('/favorites', cliente, cart.getFavorites);
router.post('/favorites/:productId', cliente, cart.addFavorite);
router.delete('/favorites/:productId', cliente, cart.deleteFavorite);

router.get('/cart', cliente, cart.getCart);
router.delete('/cart', cliente, cart.emptyCart);
router.post('/cart/items', cliente, cart.addItem);
router.patch('/cart/items/:id', cliente, cart.updateItem);
router.delete('/cart/items/:id', cliente, cart.deleteItem);

// ===================== Compras (pedidos del Ecommerce) =====================
router.post('/orders', cliente, orders.createOrder);
router.get('/me/orders', cliente, orders.getMyOrders);
router.get('/me/orders/:id', cliente, orders.getMyOrder);
router.post('/me/orders/:id/payment-notice', cliente, orders.notifyPayment);
router.post('/me/orders/:id/cancel', cliente, orders.cancelMyOrder);

router.get('/orders', admin, orders.getOrders);
router.get('/orders/:id', admin, orders.getOrder);
router.patch('/orders/:id/status', admin, orders.updateOrderStatus);
router.post('/orders/:id/payment/confirm', admin, orders.confirmPayment);
router.post('/orders/:id/payment/reject', admin, orders.rejectPayment);

// ===================== Stock =====================
router.get('/stock', personal, stock.getStock);
router.get('/stock/summary', personal, stock.getStockSummary);
router.get('/stock/movements', personal, stock.getMovements);
router.post('/stock/entry', personal, stock.registerEntry);
router.post('/stock/exit', personal, stock.registerExit);
router.post('/stock/adjustment', personal, stock.registerAdjustment);
router.post('/stock/loss', personal, stock.registerLoss);
router.post('/stock/damaged', personal, stock.registerDamaged);

// ===================== Cajas y sesiones =====================
router.get('/pos/registers', personal, cash.getRegisters);
router.post('/pos/registers', admin, cash.createRegister);
router.patch('/pos/registers/:id', admin, cash.updateRegister);
router.post('/pos/registers/:id/open', vendedor, cash.openSession);

router.get('/pos/sessions', personal, cash.getSessions);
router.get('/pos/sessions/current', vendedor, cash.getCurrentSession);
router.get('/pos/sessions/:id', personal, cash.getSession);
router.post('/pos/sessions/:id/movements', vendedor, cash.addCashMovement);
router.post('/pos/sessions/:id/close', vendedor, cash.closeSession);

// ===================== POS (exclusivo de vendedores) =====================
router.post('/pos/quote', vendedor, pos.quoteSale);
router.get('/pos/payment-info', vendedor, pos.getPaymentInfo);
router.post('/pos/sales', vendedor, pos.createSale);
router.get('/pos/sales', personal, pos.getSales);
router.get('/pos/sales/:id/ticket', personal, pos.getTicket);
router.post('/pos/sales/:id/cancel', vendedor, pos.cancelSale);

// ===================== Ventas, reportes y dashboard =====================
router.get('/sales', admin, reports.getAllSales);
router.get('/reports/sales', admin, reports.getSalesReport);
router.get('/reports/best-sellers', admin, reports.getBestSellers);
router.get('/reports/stock', admin, reports.getStockReport);
router.get('/reports/cash', admin, reports.getCashReport);
router.get('/reports/audit', admin, reports.getAudit);
router.get('/dashboard/summary', admin, reports.getDashboard);

// ===================== Exportaciones =====================
module.exports = router;
