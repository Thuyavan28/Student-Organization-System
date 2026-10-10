import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPackage, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { apiErrorMessage } from '../../api/axiosInstance';
import { ordersApi } from '../../api/orders.api';
import { productsApi } from '../../api/products.api';
import PaymentDisclaimer from '../../components/feature/PaymentDisclaimer';
import ProductCard from '../../components/feature/ProductCard';
import PublicNavbar from '../../components/layout/PublicNavbar';
import Button from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Card';
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
  const [cart, setCartState] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

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
      size: variant.size,
      unitPrice: product.yourPrice ?? product.basePrice,
      quantity: nextQuantity,
    };
    setCart(existing ? cart.map((item) => (item.variantId === variant.id ? line : item)) : [...cart, line]);
    toast.success(`${product.name} added to your cart`);
  };

  const removeLine = (variantId) => setCart(cart.filter((line) => line.variantId !== variantId));

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const estimate = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const checkout = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/shop')}`);
      return;
    }
    setPlacing(true);
    try {
      await ordersApi.create(cart.map((line) => ({ variantId: line.variantId, quantity: line.quantity })));
      toast.success('Order placed');
      setCart([]);
      setCartOpen(false);
      navigate('/me/orders');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      reload();
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader
          title="Club shop"
          subtitle="Pick a size, add to cart and pay from your phone. Members get their tier discount at checkout."
          actions={
            <Button icon={FiShoppingCart} onClick={() => setCartOpen(true)}>
              Cart ({itemCount})
            </Button>
          }
        />
        {loading && <SkeletonCards count={6} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && products?.length === 0 && (
          <EmptyState icon={FiPackage} title="The shop is empty" message="New merchandise will show up here." />
        )}
        {products?.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        )}
      </main>

      <Modal
        open={cartOpen}
        title="Your cart"
        onClose={() => setCartOpen(false)}
        footer={
          cart.length > 0 && (
            <>
              <Button variant="secondary" onClick={() => setCartOpen(false)} disabled={placing}>
                Keep shopping
              </Button>
              <Button onClick={checkout} loading={placing}>
                {user ? `Pay ${formatCurrency(estimate)}` : 'Log in to check out'}
              </Button>
            </>
          )
        }
      >
        {cart.length === 0 ? (
          <EmptyState icon={FiShoppingCart} title="Your cart is empty" message="Choose a size on any product to add it." />
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.variantId} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{line.name}</p>
                    <p className="text-slate-500">
                      {line.size === 'ONE_SIZE' ? humanize(line.size) : `Size ${line.size}`} x {line.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{formatCurrency(line.unitPrice * line.quantity)}</span>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                      onClick={() => removeLine(line.variantId)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
              <span>Estimated total</span>
              <span className="tabular-nums">{formatCurrency(estimate)}</span>
            </p>
            {!user && (
              <p className="text-sm text-slate-600">
                You need an account to order. <Link className="font-medium text-primary-700 underline" to="/login?next=%2Fshop">Log in</Link> or{' '}
                <Link className="font-medium text-primary-700 underline" to="/register">sign up</Link>; your cart is kept.
              </p>
            )}
            <PaymentDisclaimer />
          </div>
        )}
      </Modal>
    </>
  );
}
