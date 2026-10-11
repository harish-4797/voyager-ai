/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'sans-serif'],
  			serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
  			brand: ['Poppins', 'Inter', 'ui-sans-serif', 'sans-serif']
  		},
  		boxShadow: {
  			soft: '0 1px 2px rgba(20, 16, 10, 0.04), 0 8px 24px -8px rgba(20, 16, 10, 0.08)',
  			lift: '0 2px 4px rgba(20, 16, 10, 0.04), 0 24px 48px -16px rgba(20, 16, 10, 0.18)',
  			glow: '0 10px 40px -10px hsl(var(--sunset) / 0.55)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			ink: 'hsl(var(--ink) / <alpha-value>)',
  			cream: 'hsl(var(--cream) / <alpha-value>)',
  			sunset: 'hsl(var(--sunset) / <alpha-value>)',
  			coral: 'hsl(var(--coral) / <alpha-value>)',
  			sun: 'hsl(var(--sun) / <alpha-value>)',
  			ocean: 'hsl(var(--ocean) / <alpha-value>)',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			marquee: {
  				from: { transform: 'translateX(0)' },
  				to: { transform: 'translateX(-50%)' }
  			},
  			'marquee-reverse': {
  				from: { transform: 'translateX(-50%)' },
  				to: { transform: 'translateX(0)' }
  			},
  			blob: {
  				'0%, 100%': { transform: 'translate(0, 0) scale(1)' },
  				'33%': { transform: 'translate(40px, -60px) scale(1.15)' },
  				'66%': { transform: 'translate(-30px, 30px) scale(0.92)' }
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			shimmer: {
  				from: { backgroundPosition: '200% 0' },
  				to: { backgroundPosition: '-200% 0' }
  			},
  			'gradient-x': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			},
  			steam: {
  				'0%': { transform: 'translate(0, 0) scale(0.4)', opacity: '0.85' },
  				'100%': { transform: 'translate(-34px, -70px) scale(1.8)', opacity: '0' }
  			},
  			'scroll-cue': {
  				'0%': { transform: 'translateY(0)', opacity: '0' },
  				'30%': { opacity: '1' },
  				'100%': { transform: 'translateY(14px)', opacity: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			marquee: 'marquee 40s linear infinite',
  			'marquee-reverse': 'marquee-reverse 40s linear infinite',
  			blob: 'blob 18s ease-in-out infinite',
  			float: 'float 6s ease-in-out infinite',
  			shimmer: 'shimmer 2.2s linear infinite',
  			'gradient-x': 'gradient-x 6s ease infinite',
  			'scroll-cue': 'scroll-cue 1.8s ease-in-out infinite',
  			steam: 'steam 2s ease-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}