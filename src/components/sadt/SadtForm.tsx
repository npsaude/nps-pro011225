import React from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SadtCadastroStatus, SadtEstagio } from "@/components/sadt/types";

export interface SadtFormValues {
  identificacaoOperadora: string;
  numeroGuiaPrincipal: string;
  numeroGuiaOperadora: string;
  dataAutorizacao: string;
  senha: string;
  dataValidadeSenha: string;
  numeroCarteira: string;
  nomeBeneficiario: string;
  numeroCns: string;
  atendimentoRn: boolean;
  codigoOperadora: string;
  nomeContratante: string;
  nomeProfissionalSolicitante: string;
  conselhoProfissional: string;
  numeroConselho: string;
  ufConselho: string;
  codigoCbo: string;
  caracterAtendimento: string;
  dataSolicitacao: string;

  status: SadtCadastroStatus;
  estagio: SadtEstagio;

  indicacaoClinica: string;
  tabela: string;
  codigoProcedimento: string;
  descricaoProcedimento: string;
  quantidadeSolicitada: string;
  dataRealizacao: string;
  quantidadeRealizada: string;
  viaAcesso: string;
  reducaoAcrescimo: string;
  tecnicaUtilizada: string;
  fatorConversao: string;
  valorUnitario: string;
  valorTotal: string;

  codigoOperadoraPrestadorExecutante: string;
  nomePrestadorExecutante: string;
  textoAtendimento: string;
  observacoes: string;
  totalGeralGuia: string;
  assinaturaProfissionalExecutante: string;
  assinaturaBeneficiarioResponsavel: string;

  tabelaProcedimentoRealizado: string;
  codigoProcedimentoRealizado: string;
  descricaoProcedimentoRealizado: string;
  quantidadeRealizadaProcedimento: string;
  viaAcessoProcedimentoRealizado: string;
  reducaoAcrescimoProcedimentoRealizado: string;
  tecnicaUtilizadaProcedimentoRealizado: string;
}

interface SadtFormProps {
  onSubmit: (values: SadtFormValues) => void;
}

const SadtForm: React.FC<SadtFormProps> = ({ onSubmit }) => {
  const form = useForm<SadtFormValues>({
    defaultValues: {
      status: "ATIVO",
      estagio: "AGUARDANDO",
      atendimentoRn: false,
    } as Partial<SadtFormValues>,
  });

  const handleSubmit = (values: SadtFormValues) => {
    onSubmit(values);
    form.reset({
      status: "ATIVO",
      estagio: "AGUARDANDO",
      atendimentoRn: false,
    } as Partial<SadtFormValues>);
  };

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">
          Cadastro de SADT
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Preencha os dados da guia SADT, incluindo status e estágio.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[640px] overflow-auto pr-1 sm:pr-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Seção: Informações principais */}
            <section className="space-y-4 rounded-2xl bg-slate-50/70 p-4 text-xs ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Informações da guia
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="identificacaoOperadora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identificação da Operadora</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Vida Mais Saúde"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroGuiaPrincipal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Guia Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="0000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroGuiaOperadora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nº da Guia Atribuído pela Operadora
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="0000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataAutorizacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Autorização</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input placeholder="Senha de autorização" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataValidadeSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade da Senha</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="numeroCarteira"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Carteira</FormLabel>
                      <FormControl>
                        <Input placeholder="Número da carteira" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroCns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do CNS</FormLabel>
                      <FormControl>
                        <Input placeholder="Cartão Nacional de Saúde" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nomeBeneficiario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Beneficiário</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3">
                  <FormField
                    control={form.control}
                    name="codigoOperadora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da Operadora</FormLabel>
                        <FormControl>
                          <Input placeholder="Código ANS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="atendimentoRn"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(!!checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="text-xs">
                          Atendimento a RN
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* Seção: Profissional e contratante */}
            <section className="space-y-4 rounded-2xl bg-slate-50/70 p-4 text-xs ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Dados do contratante e profissional solicitante
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nomeContratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contratante</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do contratante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomeProfissionalSolicitante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Profissional Solicitante</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do profissional"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="conselhoProfissional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conselho Profissional</FormLabel>
                      <FormControl>
                        <Input placeholder="CRM, CRO, COREN..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroConselho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número no Conselho</FormLabel>
                      <FormControl>
                        <Input placeholder="Número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ufConselho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF do Conselho</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="codigoCbo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código CBO</FormLabel>
                      <FormControl>
                        <Input placeholder="Código CBO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="caracterAtendimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caráter de Atendimento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Eletivo, Urgência, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataSolicitacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Solicitação</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ATIVO">Ativo</SelectItem>
                            <SelectItem value="INATIVO">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estagio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estágio</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione o estágio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AGUARDANDO">
                              Aguardando
                            </SelectItem>
                            <SelectItem value="RECEBIDO">Recebido</SelectItem>
                            <SelectItem value="EM_FATURAMENTO">
                              Em faturamento
                            </SelectItem>
                            <SelectItem value="PAGO">Pago</SelectItem>
                            <SelectItem value="RETORNO_POR_GLOSA">
                              Retorno por Glosa
                            </SelectItem>
                            <SelectItem value="DEFESA_POR_GLOSA">
                              Defesa por Glosa
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Seção: Procedimento solicitado */}
            <section className="space-y-4 rounded-2xl bg-slate-50/70 p-4 text-xs ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Procedimento solicitado
              </h3>

              <FormField
                control={form.control}
                name="indicacaoClinica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicação Clínica</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Descreva a indicação clínica"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="tabela"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tabela</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: TUSS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigoProcedimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Procedimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Código" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricaoProcedimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Procedimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantidadeSolicitada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Solicitada</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataRealizacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Realização</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidadeRealizada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Realizada</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="viaAcesso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Via de Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="Via de acesso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reducaoAcrescimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redução/Acréscimo (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tecnicaUtilizada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Técnica Utilizada</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição da técnica" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fatorConversao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fator de Conversão</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Unitário</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Seção: Prestador executante e totais */}
            <section className="space-y-4 rounded-2xl bg-slate-50/70 p-4 text-xs ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Prestador executante e totais
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="codigoOperadoraPrestadorExecutante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Código da Operadora (Prestador Executante)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Código do prestador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomePrestadorExecutante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Prestador Executante</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do prestador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="textoAtendimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do Atendimento</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Resumo do atendimento"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Observações adicionais"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="totalGeralGuia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Geral da Guia</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assinaturaProfissionalExecutante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assinatura do Profissional Executante</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome/Identificação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assinaturaBeneficiarioResponsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Assinatura do Beneficiário ou Responsável
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nome/Identificação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Seção: Procedimento realizado */}
            <section className="space-y-4 rounded-2xl bg-slate-50/70 p-4 text-xs ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Procedimento realizado
              </h3>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="tabelaProcedimentoRealizado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tabela</FormLabel>
                      <FormControl>
                        <Input placeholder="Tabela utilizada" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigoProcedimentoRealizado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Procedimento Realizado</FormLabel>
                      <FormControl>
                        <Input placeholder="Código" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricaoProcedimentoRealizado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Procedimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantidadeRealizadaProcedimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Realizada</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="viaAcessoProcedimentoRealizado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Via de Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="Via de acesso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reducaoAcrescimoProcedimentoRealizado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redução/Acréscimo (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tecnicaUtilizadaProcedimentoRealizado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnica Utilizada</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição da técnica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="rounded-full px-6 text-xs sm:text-sm"
              >
                Salvar SADT
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SadtForm;