'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Script from 'next/script';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal } = useCartStore();
  const { user } = useAuthStore();
  
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (items.length === 0) router.push('/cart');
    
    async function loadAddresses() {
      try {
        const { data } = await api.get('/users/addresses');
        setAddresses(data);
        const defaultAddr = data.find((a: any) => a.isDefault) || data[0];
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
      } catch (e) {
        console.error('Failed to load addresses');
      }
    }
    loadAddresses();
  }, [items.length, router]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert('Please select a delivery address');
    
    setIsProcessing(true);
    try {
      const { data } = await api.post('/orders', {
        addressId: selectedAddress,
        paymentMethod
      });

      if (paymentMethod === 'COD') {
        router.push(`/orders/${data.order.id}/success`);
      } else if (data.razorpayOrderId) {
        // Init Razorpay
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: Math.round(data.order.totalAmount * 100),
          currency: "INR",
          name: "Anjali Alankaram",
          description: "Order Payment",
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            router.push(`/orders/${data.order.id}/success`);
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || ""
          },
          theme: { color: "#B76E79" }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          alert('Payment Failed. You can retry from orders page.');
          router.push(`/orders/${data.order.id}`);
        });
        rzp.open();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal + shipping;

  return (
    <div className="container py-10 max-w-4xl">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <h1 className="text-3xl font-outfit font-bold mb-10">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          {/* Address Selection */}
          <section>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Delivery Address</h2>
            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex p-4 border rounded-xl cursor-pointer transition-colors ${selectedAddress === addr.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="address" 
                      value={addr.id} 
                      checked={selectedAddress === addr.id}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      className="mt-1 mr-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium">{addr.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{addr.line1}, {addr.line2}</p>
                      <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-sm font-medium mt-2">{addr.phone}</p>
                    </div>
                  </label>
                ))}
                <button className="text-sm text-primary font-medium hover:underline mt-2">+ Add New Address</button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No addresses found. Please add an address in your profile.</p>
            )}
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Payment Method</h2>
            <div className="space-y-3">
              <label className={`flex p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="RAZORPAY" 
                  checked={paymentMethod === 'RAZORPAY'}
                  onChange={() => setPaymentMethod('RAZORPAY')}
                  className="mt-1 mr-4 accent-primary"
                />
                <div>
                  <p className="font-medium">Pay Online (UPI, Cards, Netbanking)</p>
                  <p className="text-sm text-muted-foreground mt-1">Safe and secure payments via Razorpay.</p>
                </div>
              </label>
              
              <label className={`flex p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="COD" 
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 mr-4 accent-primary"
                />
                <div>
                  <p className="font-medium">Cash on Delivery (COD)</p>
                  <p className="text-sm text-muted-foreground mt-1">Pay when you receive the order.</p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 p-6 rounded-2xl h-fit">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground max-w-[200px] truncate">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-medium">
                  {formatPrice((Number(item.product.salePrice || item.product.basePrice) + Number(item.variant.extraPrice)) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-sm mb-6 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shipping</span>
              {shipping === 0 ? (
                <span className="text-green-600 font-medium">Free</span>
              ) : (
                <span className="font-medium">{formatPrice(shipping)}</span>
              )}
            </div>
          </div>
          
          <div className="border-t pt-4 mb-8 border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total to Pay</span>
              <span className="font-bold text-2xl text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          <button 
            onClick={handlePlaceOrder}
            disabled={isProcessing || !selectedAddress}
            className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
          >
            {isProcessing ? 'Processing...' : `Place Order • ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
