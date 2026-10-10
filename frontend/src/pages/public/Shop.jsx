import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LuPackage,
  LuShoppingCart,
  LuTrash2,
  LuBadgeCheck,
  LuSearch,
  LuCheck,
  LuShieldCheck,
  LuTruck,
  LuAward,
} from 'react-icons/lu';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axiosInstance';
import { ordersApi } from '../../api/orders.api';
import { productsApi } from '../../api/products.api';
import PaymentQrModal from '../../components/feature/PaymentQrModal';
import ProductCard from '../../components/feature/ProductCard';
import PublicNavbar from '../../components/layout/PublicNavbar';
import Button from '../../components/ui/Button';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';

const CART_KEY = 'clubflow_cart';
const MAX_QUANTITY = 10;

function loadCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // The cart still works in memory when storage is unavailable.
  }
}

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [cart, setCartState] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const { data: products, loading, error, reload } = useFetch(() => productsApi.list(), [user?.id]);

  const setCart = (next) => {
    setCartState(next);
    saveCart(next);
  };

  const addToCart = (product, variant, quantity) => {
    const existing = cart.find((line) => line.variantId === variant.id);
    const limit = Math.min(variant.stock, MAX_QUANTITY);
    const nextQuantity = Math.min(limit, (existing?.quantity ?? 0) + quantity);
    const line = {
      variantId: variant.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size: variant.size,
      unitPrice: product.yourPrice ?? product.basePrice,
      quantity: nextQuantity,
    };
    setCart(existing ? cart.map((item) => (item.variantId === variant.id ? line : item)) : [...cart, line]);
    toast.success(`${product.name} (Size ${variant.size}) added to your cart!`);
  };

  const removeLine = (variantId) => setCart(cart.filter((line) => line.variantId !== variantId));

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const estimate = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const startCheckout = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/shop')}`);
      return;
    }
    setCartOpen(false);
    setPayModalOpen(true);
  };

  const checkout = async () => {
    setPlacing(true);
    try {
      await ordersApi.create(cart.map((line) => ({ variantId: line.variantId, quantity: line.quantity })));
      queryClient.invalidateQueries({ queryKey: ['useFetch'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders-list'] });
      toast.success('Payment verified! Merchandise order placed successfully.');
      setCart([]);
      setPayModalOpen(false);
      navigate('/me/orders');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      reload();
    } finally {
      setPlacing(false);
    }
  };

  const productsList = Array.isArray(products) ? products : [];

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q || product.name.toLowerCase().includes(q) || product.description.toLowerCase().includes(q);

      const name = product.name.toLowerCase();
      if (categoryFilter === 'HOODIE') return matchesSearch && name.includes('hoodie');
      if (categoryFilter === 'TSHIRT') return matchesSearch && (name.includes('shirt') || name.includes('tee'));
      if (categoryFilter === 'CAP') return matchesSearch && (name.includes('cap') || name.includes('hat'));
      if (categoryFilter === 'BAG') return matchesSearch && (name.includes('bag') || name.includes('tote'));
      return matchesSearch;
    });
  }, [productsList, search, categoryFilter]);

  return (
    <>
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Hero Banner Section */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-slate-700/60 backdrop-blur-sm">
              <LuBadgeCheck className="h-3.5 w-3.5" />
              Official Collegiate Collection
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Wear Your Association Pride.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore authentic heavyweight hoodies, tees, embroidered caps, and tote bags. Hand-crafted collegiate apparel for students, alumni, and faculty.
            </p>

            {/* Quick Benefits Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <LuShieldCheck className="h-4 w-4 text-emerald-400" /> Premium Heavyweight Quality
              </span>
              <span className="flex items-center gap-1.5">
                <LuAward className="h-4 w-4 text-amber-400" /> Member Tier Discounts
              </span>
              <span className="flex items-center gap-1.5">
                <LuTruck className="h-4 w-4 text-sky-400" /> Campus Desk Pickup
              </span>
            </div>
          </div>

          {/* Cart Floating Button in Header */}
          <div className="absolute top-6 right-6 z-20">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-xl transition-all hover:bg-slate-100 hover:scale-105 active:scale-95"
            >
              <LuShoppingCart className="h-4 w-4" />
              <span>Cart ({itemCount})</span>
              {itemCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white tabular-nums">
                  {formatCurrency(estimate)}
                </span>
              )}
            </button>
          </div>

          {/* Decorative Glowing Sphere */}
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Collection' },
              { id: 'HOODIE', label: 'Hoodies' },
              { id: 'TSHIRT', label: 'T-Shirts' },
              { id: 'CAP', label: 'Caps & Hats' },
              { id: 'BAG', label: 'Totes & Bags' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search apparel or accessories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-sm"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading && <SkeletonCards count={4} />}
        {error && <ErrorState message={error} onRetry={reload} />}

        {!loading && !error && filteredProducts.length === 0 && (
          <EmptyState
            icon={LuPackage}
            title="No merchandise found"
            message={
              search || categoryFilter !== 'ALL'
                ? 'No items match your filter. Try viewing the full collection.'
                : 'New club merchandise will be stocked shortly.'
            }
            action={
              (search || categoryFilter !== 'ALL') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('ALL');
                  }}
                >
                  View All Products
                </Button>
              )
            }
          />
        )}

        {filteredProducts.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer Modal */}
      <Modal
        open={cartOpen}
        title="Your Shopping Cart"
        onClose={() => setCartOpen(false)}
        size="md"
        footer={
          cart.length > 0 && (
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => setCartOpen(false)} disabled={placing}>
                Keep Shopping
              </Button>
              <Button onClick={startCheckout} loading={placing}>
                {user ? `Proceed to Pay (${formatCurrency(estimate)})` : 'Log in to Checkout'}
              </Button>
            </div>
          )
        }
      >
        {cart.length === 0 ? (
          <EmptyState
            icon={LuShoppingCart}
            title="Your cart is empty"
            message="Explore our collection and pick a size to add items to your cart."
          />
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {cart.map((line) => (
                <li key={line.variantId} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div className="flex items-center gap-3">
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt={line.name}
                        className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                        <LuPackage className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{line.name}</p>
                      <p className="text-slate-500 font-medium">
                        {line.size === 'ONE_SIZE' ? humanize(line.size) : `Size ${line.size}`} × {line.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      onClick={() => removeLine(line.variantId)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
              <span>Estimated Order Total</span>
              <span className="text-lg tabular-nums text-emerald-700">{formatCurrency(estimate)}</span>
            </div>

            {!user && (
              <p className="text-xs text-slate-500 rounded-xl bg-slate-50 p-3">
                You need an account to place an order.{' '}
                <Link className="font-bold text-slate-900 underline" to="/login?next=%2Fshop">
                  Log in
                </Link>{' '}
                or{' '}
                <Link className="font-bold text-slate-900 underline" to="/register">
                  sign up
                </Link>
                ; your cart will be saved.
              </p>
            )}

          </div>
        )}
      </Modal>

      {/* QR Payment Checkout Modal */}
      <PaymentQrModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Merchandise Checkout — Scan & Pay"
        amount={estimate}
        note={`Club Store (${itemCount} items)`}
        onConfirm={checkout}
        confirmLabel="I have paid — Complete order"
        loading={placing}
      />
    </>
  );
}
