'use client';

interface PitchItemBarProps {
  product: {
    product: string;
    description: string;
    key_features: string[];
  } | null;
  context: string;
}

export default function PitchItemBar({ product, context }: PitchItemBarProps) {
  // Show nothing if no product or context
  if (!product && !context) {
    return null;
  }

  // Show random product challenge
  if (product) {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30">
        <h3 className="text-sm font-medium text-purple-400 mb-2">Your Pitch Target:</h3>
        <div className="mb-3">
          <p className="text-white text-lg font-semibold">{product.product}</p>
          <p className="text-gray-300 text-sm">{product.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.key_features.map((feature, i) => (
            <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
              {feature}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Show custom pitch context
  if (context) {
    return (
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/30">
        <h3 className="text-sm font-medium text-green-400 mb-2">Selling:</h3>
        <p className="text-white text-lg">{context}</p>
      </div>
    );
  }

  return null;
}
