import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import BillingRecordCard from "@/components/faturamento/BillingRecordCard.tsx";
import type { BillingRecord } from "@/components/faturamento/billing-types.ts";
import { Bell, CalendarDays, Search, User2 } from "lucide-react";

const billingRecords: BillingRecord[] = [
  {
    id: "1",
    doctorName: "Dr. Carlos Pereira",
    patientName: "Mariana Souza",
    procedure: "Artroplastia de Quadril",
    surgeryDate: "04/12/2024",
    hospital: "Hospital Sírio-Libanês",
    billingLocation: "Sede SP",
    value: 12500,
    steps: [
      {
        id: "surgery",
        label: "Cirurgia Realizada",
        status: "completed",
        date: "05/12",
      },
      {
        id: "invoiced",
        label: "Faturado",
        status: "completed",
        date: "08/12",
      },
      {
        id: "received",
        label: "Recebimento",
        status: "pending",
      },
      {
        id: "disallowance",
        label: "Glosa",
        status: "processing",
      },
      {
        id: "appeal",
        label: "Defesa de Glosa",
        status: "waiting",
      },
      {
        id: "disallowance_received",
        label: "Recebimento da Glosa",
        status: "nc",
      },
    ],
  },
  {
    id: "2",
    doctorName: "Dra. Ana Costa",
    patientName: "Roberto Almeida",
    procedure: "Cateterismo Cardíaco",
    surgeryDate: "30/11/2024",
    hospital: "Hospital Albert Einstein",
    billingLocation: "Unidade Sul",
    value: 8200,
    steps: [
      {
        id: "surgery",
        label: "Cirurgia Realizada",
        status: "completed",
        date: "01/12",
      },
      {
        id: "invoiced",
        label: "Faturado",
        status: "completed",
        date: "03/12",
      },
      {
        id: "received",
        label: "Recebimento",
        status: "completed",
        date: "20/12",
      },
      {
        id: "disallowance",
        label: "Glosa",
        status: "nc",
      },
      {
        id: "appeal",
        label: "Defesa de Glosa",
        status: "nc",
      },
      {
        id: "disallowance_received",
        label: "Recebimento da Glosa",
        status: "nc",
      },
    ],
  },
  {
    id: "3",
    doctorName: "Dr. Ricardo Lima",
    patientName: "Fernanda Lima",
    procedure: "Craniotomia",
    surgeryDate: "19/11/2024",
    hospital: "Hospital Oswaldo Cruz",
    billingLocation: "Sede SP",
    value: 9800,
    steps: [
      {
        id: "surgery",
        label: "Cirurgia Realizada",
        status: "completed",
        date: "20/11",
      },
      {
        id: "invoiced",
        label: "Faturado",
        status: "completed",
        date: "22/11",
      },
      {
        id: "received",
        label: "Recebimento",
        status: "pending",
      },
      {
        id: "disallowance",
        label: "Glosa",
        status: "completed",
        date: "05/12",
      },
      {
        id: "appeal",
        label: "Defesa de Glosa",
        status: "processing",
      },
      {
        id: "disallowance_received",
        label: "Recebimento da Glosa",
        status: "nc",
      },
    ],
  },
];

const AdminFaturamento = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="faturamento" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Page header */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Faturamento
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Extrato detalhado de procedimentos, status de glosas e
                recebimentos.
              </p>
            </div>

            {/* Top search and notifications */}
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200 md:flex dark:bg-slate-900 dark:ring-slate-700">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="w-40 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
          </header>

          <main className="flex-1 space-y-4">
            {/* Filters card */}
            <Card className="border-[#D9DEE3] bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Filtros do extrato
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Busque por médico, paciente ou data da cirurgia para localizar
                  um procedimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
                  {/* Médico */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Médico
                    </Label>
                    <div className="relative">
                      <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Buscar por médico"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Paciente */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Paciente
                    </Label>
                    <div className="relative">
                      <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Buscar por paciente"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Data */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Data
                    </Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="dd/mm/aaaa"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Button */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="h-10 w-full rounded-xl bg-[#1D4E77] px-4 text-sm font-semibold text-white hover:bg-[#163a5a]"
                    >
                      Filtrar Extrato
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing records list */}
            <section className="space-y-3">
              {billingRecords.map((record) => (
                <BillingRecordCard key={record.id} record={record} />
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminFaturamento;