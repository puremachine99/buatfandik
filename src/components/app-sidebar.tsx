"use client";

import { Home, Users, FileText, Send, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Data Debitur",
    url: "/debitur",
    icon: Users,
  },
  {
    title: "Broadcast",
    url: "/broadcast",
    icon: Send,
  },
  {
    title: "Broadcast Logs",
    url: "/logs",
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 p-2 px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Broadcast Hehe
            </span>
          </div>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url}
                    render={<Link href={item.url} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <a
          href="https://wa.me/6289672301013"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-center transition-colors hover:bg-accent group"
        >
          <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide group-hover:text-muted-foreground">
            © 2026{" "}
            <span className="font-semibold text-muted-foreground/80">
              Nono Komputer
            </span>
          </p>
          <p className="text-[9px] text-muted-foreground/40 mt-0.5">
            Hubungi via WhatsApp
          </p>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
