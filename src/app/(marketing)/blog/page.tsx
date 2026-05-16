import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "AssistMint Blog — Tips, updates, and insights for restaurant owners.",
};

export default function BlogPage() {
  const posts = [
    {
      title: "How AI is Transforming Restaurant Ordering in India",
      description: "Discover how Indian restaurants are leveraging AI chatbots to automate ordering, reduce wait times, and increase revenue.",
      date: "Coming Soon",
      tag: "Industry",
    },
    {
      title: "5 Ways to Increase Your Restaurant's Revenue with WhatsApp",
      description: "Practical tips for using WhatsApp Business to boost customer engagement and drive repeat orders.",
      date: "Coming Soon",
      tag: "Tips",
    },
    {
      title: "The Complete Guide to WhatsApp Business API for Restaurants",
      description: "Everything you need to know about setting up WhatsApp Business API for your restaurant.",
      date: "Coming Soon",
      tag: "Guide",
    },
  ];

  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tips, updates, and insights for restaurant owners.
        </p>

        <div className="mt-10 space-y-4">
          {posts.map((post) => (
            <div
              key={post.title}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {post.tag}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h2 className="text-lg font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {post.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-secondary/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Our blog is launching soon. Stay tuned for helpful content on
            restaurant automation and AI.
          </p>
        </div>
      </div>
    </div>
  );
}
