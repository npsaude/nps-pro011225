import { supabase } from "@/integrations/supabase/client";
import { criarClinica, type ClinicaInput } from "@/services/clinicas-service";
import { salvarMedico } from "@/services/medicos-service";
import type { DbDescricaoCirurgicaStatus } from "@/db/schema";

/**
 * Cria dados de exemplo nas principais tabelas:
 * - clinicas
 * - usuarios_sistema (médico)
 * - medicos
 * - descricoes_cirurgicas (uma descrição aprovada/confirmada)
 *
 * Pode ser executado quantas vezes quiser; só cria registros
 * quando as tabelas ainda estiverem vazias.
 */
export async function criarDadosExemplo(): Promise<void> {
  // 1) Garante que exista pelo menos uma clínica/hospital
  const { data: clinicasExistentes, error: clinicasCheckError } =
    await supabase.from("clinicas").select("id").limit(2);

  if (clinicasCheckError) {
    throw new Error(
      clinicasCheckError.message ||
        "Não foi possível verificar as clínicas existentes.",
    );
  }

  const clinicaIds: string[] = [];

  if (!clinicasExistentes || clinicasExistentes.length === 0) {
    const exemplosClinicas: ClinicaInput[] = [
      {
        tipo_unidade: "HOSPITAL",
        codigo_referencial_got: "GOT-HOSP-001",
        razao_social: "Hospital São Lucas Ltda",
        nome_fantasia: "Hospital São Lucas",
        nome_rede: "Rede Vida Saudável",
        cnpj: "12.345.678/0001-90",
        endereco: "Av. Paulista, 1000",
        complemento: "10º andar",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
        telefone: "(11) 4000-1234",
        contato: "Carla Andrade",
        cargo: "Coordenadora de Faturamento",
        nome_contato_faturamento: "Carla Andrade",
        email_contato_faturamento: "faturamento@saolucas.com.br",
        telefone_contato_faturamento: "(11) 4000-5678",
      },
      {
        tipo_unidade: "CLINICA",
        codigo_referencial_got: "GOT-CLI-001",
        razao_social: "Clínica Ortopédica Bem Viver Ltda",
        nome_fantasia: "Clínica Bem Viver",
        nome_rede: "Rede Vida Saudável",
        cnpj: "98.765.432/0001-10",
        endereco: "Rua das Flores, 250",
        complemento: "Conjunto 504",
        bairro: "Centro",
        cidade: "Campinas",
        uf: "SP",
        telefone: "(19) 3555-9090",
        contato: "Marcos Figueiredo",
        cargo: "Supervisor de Faturamento",
        nome_contato_faturamento: "Marcos Figueiredo",
        email_contato_faturamento: "faturamento@bemviver.com.br",
        telefone_contato_faturamento: "(19) 3555-9091",
      },
    ];

    for (const payload of exemplosClinicas) {
      const clinica = await criarClinica(payload);
      clinicaIds.push(clinica.id);
    }
  } else {
    clinicasExistentes.forEach((c) => {
      if (c.id) clinicaIds.push(c.id as string);
    });
  }

  // 2) Garante que exista pelo menos um usuário médico em usuarios_sistema
  const { data: medicoUsers, error: medicoUsersError } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .eq("regra", "MEDICO")
    .limit(1);

  if (medicoUsersError) {
    throw new Error(
      medicoUsersError.message ||
        "Não foi possível verificar os usuários médicos existentes.",
    );
  }

  let medicoUser: any | null = null;

  if (medicoUsers && medicoUsers.length > 0) {
    medicoUser = medicoUsers[0];
  } else {
    const { data: novoMedicoUser, error: novoMedicoError } = await supabase
      .from("usuarios_sistema")
      .insert({
        nome: "Dr. Adriano Exemplo",
        email: "medico.demo+adriano@example.com",
        celular: "(11) 98888-0000",
        regra: "MEDICO",
        ativo: true,
      })
      .select("*")
      .single();

    if (novoMedicoError) {
      throw new Error(
        novoMedicoError.message ||
          "Não foi possível criar o usuário médico de exemplo.",
      );
    }

    medicoUser = novoMedicoUser;
  }

  // 3) Garante que esse usuário médico tenha cadastro em medicos
  const medicoId = medicoUser.id_user as string;

  const { data: medicoExistente, error: medicoCheckError } = await supabase
    .from("medicos")
    .select("*")
    .eq("id", medicoId)
    .maybeSingle();

  if (medicoCheckError) {
    throw new Error(
      medicoCheckError.message ||
        "Não foi possível verificar o cadastro complementar do médico.",
    );
  }

  if (!medicoExistente) {
    await salvarMedico({
      id: medicoId,
      nome: medicoUser.nome as string,
      email: medicoUser.email as string,
      telefone_whatsapp: (medicoUser.celular as string | null) ?? null,
      crm: "12345-SP",
      clinicas_ids: clinicaIds.length > 0 ? [clinicaIds[0]] : [],
      hospitais_ids: [], // sem hospitais específicos no seed de exemplo
    });
  }

  // 4) Garante que exista pelo menos uma descrição cirúrgica com status "CONFIRMADO" (aprovada)
  const { data: descricoesExistentes, error: descricoesCheckError } =
    await supabase.from("descricoes_cirurgicas").select("id").limit(1);

  if (descricoesCheckError) {
    throw new Error(
      descricoesCheckError.message ||
        "Não foi possível verificar descrições cirúrgicas existentes.",
    );
  }

  if (!descricoesExistentes || descricoesExistentes.length === 0) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error(
        "É preciso estar logado para criar a descrição cirúrgica de exemplo.",
      );
    }

    const agora = new Date();
    const hojeData = agora.toISOString().slice(0, 10); // yyyy-mm-dd
    const agoraIso = agora.toISOString();
    const statusAprovado: DbDescricaoCirurgicaStatus = "CONFIRMADO";

    const { error: insertDescError } = await supabase
      .from("descricoes_cirurgicas")
      .insert({
        user_id: userData.user.id,
        status: statusAprovado,

        // Identificação do paciente
        prontuario: "PRONT-2025-0001",
        registro: "RG-1234567",
        nome_social: "João da Silva",
        registro_civil: "João Pereira da Silva",
        cpf: "123.456.789-09",
        matricula: "MAT-0001",
        data_nascimento: "1980-05-15",
        idade: 44,
        sexo: "M",

        // Internação
        convenio_plano: "Saúde Premium",
        setor: "Centro Cirúrgico",
        leito: "12B",
        dthr_admissao: agoraIso,

        // Informações iniciais da cirurgia
        tipo_cirurgia: "Artroscopia de joelho",
        data_inicio_procedimento: hojeData,
        hora_inicio_procedimento: "08:30:00",
        data_fim_procedimento: hojeData,
        hora_fim_procedimento: "10:15:00",
        diagnostico_pre_operatorio: "Lesão de menisco medial",
        diagnostico_pos_operatorio:
          "Lesão de menisco medial tratada com sucesso",

        // Procedimentos (JSON)
        procedimentos: [
          {
            procedimento_id: "PROC-001",
            descricao_procedimento:
              "Artroscopia de joelho com meniscectomia parcial",
            codigo_procedimento: "123456",
            tipo_procedimento: "principal",
            quantidade: 1,
          },
        ],

        // Equipe (JSON)
        equipe: [
          {
            nome_profissional: medicoUser.nome as string,
            funcao: "Cirurgião",
            conselho: "CRM",
            numero_conselho: "12345",
            uf_conselho: "SP",
          },
        ],

        // Texto da descrição
        descricao_cirurgica:
          "Procedimento realizado conforme técnica habitual, sem intercorrências significativas. Avaliação articular completa com meniscectomia parcial conforme necessidade.",

        // Auditoria
        cirurgiao_responsavel: medicoUser.nome as string,
        cirurgiao_responsavel_crm: "12345-SP",
        data_hora_afere: agoraIso,
        usuario_impressao: "Administrador Demo",
        data_hora_impressao: agoraIso,

        // Materiais (JSON)
        materiais: [
          {
            material_id: "MAT-001",
            nome_material: "Sutura absorvível",
            descricao_material: "Fio de sutura absorvível 2-0",
            quantidade: 2,
            lote: "L123",
            fabricante: "Fabricante Demo",
          },
        ],

        // Informações adicionais
        diagnostico_pre_igual_pos: true,
        houve_complicacoes: false,
        descricao_complicacoes: null,
        possui_peca_anatomo: false,
        sangramento_estimado: "Baixo",
        observacoes_adicionais:
          "Paciente encaminhado para sala de recuperação anestésica em bom estado geral.",

        // Plano terapêutico pós-operatório
        uso_antibioticos: "Cefazolina profilática por 24 horas.",
        profilaxia_tev_tvp:
          "Meias de compressão elástica e deambulação precoce.",
        troca_curativo: "Primeira troca em 24 horas, depois conforme avaliação.",
        dieta: "Leve após 6 horas de observação.",
        deambulacao: "Assistida após 8 horas, conforme tolerância.",
        previsao_alta: "Alta prevista para o dia seguinte ao procedimento.",
        acompanhamento_pela_instituicao: true,
        outras_orientacoes:
          "Retorno ambulatorial em 7 dias para revisão do curativo.",
      });

    if (insertDescError) {
      throw new Error(
        insertDescError.message ||
          "Não foi possível criar a descrição cirúrgica de exemplo.",
      );
    }
  }
}