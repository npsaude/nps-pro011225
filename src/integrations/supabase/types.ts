// Tipos gerados automaticamente do schema do Supabase (supabase gen types).
// Não edite manualmente.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          asaas_token: string | null
          created_at: string
          id: string
          openai_api_token: string | null
          openai_model: string | null
          updated_at: string
          video_youtube: string | null
        }
        Insert: {
          asaas_token?: string | null
          created_at?: string
          id?: string
          openai_api_token?: string | null
          openai_model?: string | null
          updated_at?: string
          video_youtube?: string | null
        }
        Update: {
          asaas_token?: string | null
          created_at?: string
          id?: string
          openai_api_token?: string | null
          openai_model?: string | null
          updated_at?: string
          video_youtube?: string | null
        }
        Relationships: []
      }
      asaas_webhook_events: {
        Row: {
          customer_id: string | null
          enrollment_id: string | null
          event: string | null
          external_reference: string | null
          id: string
          payload: Json
          payment_id: string | null
          process_error: string | null
          processed: boolean
          processed_at: string | null
          provider_event_id: string | null
          received_at: string
          subscription_id: string | null
        }
        Insert: {
          customer_id?: string | null
          enrollment_id?: string | null
          event?: string | null
          external_reference?: string | null
          id?: string
          payload: Json
          payment_id?: string | null
          process_error?: string | null
          processed?: boolean
          processed_at?: string | null
          provider_event_id?: string | null
          received_at?: string
          subscription_id?: string | null
        }
        Update: {
          customer_id?: string | null
          enrollment_id?: string | null
          event?: string | null
          external_reference?: string | null
          id?: string
          payload?: Json
          payment_id?: string | null
          process_error?: string | null
          processed?: boolean
          processed_at?: string | null
          provider_event_id?: string | null
          received_at?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_webhook_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "subscription_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      cbhpm_cirurgias: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string
          incidencia: string | null
          n_auxiliares: number | null
          porte: string | null
          porte_anestesico: string | null
          valor_porte: number | null
          video: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao: string
          incidencia?: string | null
          n_auxiliares?: number | null
          porte?: string | null
          porte_anestesico?: string | null
          valor_porte?: number | null
          video?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string
          incidencia?: string | null
          n_auxiliares?: number | null
          porte?: string | null
          porte_anestesico?: string | null
          valor_porte?: number | null
          video?: string | null
        }
        Relationships: []
      }
      clinicas: {
        Row: {
          bairro: string
          cargo: string | null
          cidade: string
          cnpj: string
          codigo_referencial_got: string | null
          complemento: string | null
          contato: string | null
          created_at: string | null
          email_contato_faturamento: string | null
          email_contato_faturamento_secundario: string | null
          endereco: string
          id: string
          nome_contato_faturamento: string | null
          nome_fantasia: string
          nome_rede: string | null
          razao_social: string
          status: string
          telefone: string | null
          telefone_contato_faturamento: string | null
          tipo_unidade: string
          uf: string
          updated_at: string | null
        }
        Insert: {
          bairro: string
          cargo?: string | null
          cidade: string
          cnpj: string
          codigo_referencial_got?: string | null
          complemento?: string | null
          contato?: string | null
          created_at?: string | null
          email_contato_faturamento?: string | null
          email_contato_faturamento_secundario?: string | null
          endereco: string
          id?: string
          nome_contato_faturamento?: string | null
          nome_fantasia: string
          nome_rede?: string | null
          razao_social: string
          status?: string
          telefone?: string | null
          telefone_contato_faturamento?: string | null
          tipo_unidade?: string
          uf: string
          updated_at?: string | null
        }
        Update: {
          bairro?: string
          cargo?: string | null
          cidade?: string
          cnpj?: string
          codigo_referencial_got?: string | null
          complemento?: string | null
          contato?: string | null
          created_at?: string | null
          email_contato_faturamento?: string | null
          email_contato_faturamento_secundario?: string | null
          endereco?: string
          id?: string
          nome_contato_faturamento?: string | null
          nome_fantasia?: string
          nome_rede?: string | null
          razao_social?: string
          status?: string
          telefone?: string | null
          telefone_contato_faturamento?: string | null
          tipo_unidade?: string
          uf?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_acceptances: {
        Row: {
          acceptance_ip: unknown
          accepted_at: string
          accepted_date: string | null
          accepted_time: string | null
          browser: string | null
          browser_version: string | null
          contract_version: number
          customer_email: string
          device_type: string
          expires_at: string | null
          id: string
        }
        Insert: {
          acceptance_ip?: unknown
          accepted_at?: string
          accepted_date?: string | null
          accepted_time?: string | null
          browser?: string | null
          browser_version?: string | null
          contract_version: number
          customer_email: string
          device_type: string
          expires_at?: string | null
          id?: string
        }
        Update: {
          acceptance_ip?: unknown
          accepted_at?: string
          accepted_date?: string | null
          accepted_time?: string | null
          browser?: string | null
          browser_version?: string | null
          contract_version?: number
          customer_email?: string
          device_type?: string
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          content: string
          created_at: string
          id: string
          status: string
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          status?: string
          version_number: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          status?: string
          version_number?: number
        }
        Relationships: []
      }
      descricoes_cirurgicas: {
        Row: {
          acompanhamento_pela_instituicao: boolean | null
          cirurgiao_responsavel: string | null
          cirurgiao_responsavel_crm: string | null
          convenio_plano: string | null
          cpf: string | null
          created_at: string | null
          data_fim_procedimento: string | null
          data_hora_afere: string | null
          data_hora_impressao: string | null
          data_inicio_procedimento: string | null
          data_nascimento: string | null
          deambulacao: string | null
          descricao_cirurgica: string | null
          descricao_complicacoes: string | null
          diagnostico_pos_operatorio: string | null
          diagnostico_pre_igual_pos: boolean | null
          diagnostico_pre_operatorio: string | null
          dieta: string | null
          dthr_admissao: string | null
          equipe: Json | null
          hora_fim_procedimento: string | null
          hora_inicio_procedimento: string | null
          houve_complicacoes: boolean | null
          id: string
          idade: number | null
          leito: string | null
          materiais: Json | null
          matricula: string | null
          nome_social: string | null
          observacoes_adicionais: string | null
          outras_orientacoes: string | null
          possui_peca_anatomo: boolean | null
          previsao_alta: string | null
          procedimentos: Json | null
          profilaxia_tev_tvp: string | null
          prontuario: string | null
          registro: string | null
          registro_civil: string | null
          sangramento_estimado: string | null
          setor: string | null
          sexo: string | null
          status: string | null
          storage_folder: string | null
          tipo_cirurgia: string | null
          troca_curativo: string | null
          updated_at: string | null
          user_id: string
          uso_antibioticos: string | null
          usuario_impressao: string | null
        }
        Insert: {
          acompanhamento_pela_instituicao?: boolean | null
          cirurgiao_responsavel?: string | null
          cirurgiao_responsavel_crm?: string | null
          convenio_plano?: string | null
          cpf?: string | null
          created_at?: string | null
          data_fim_procedimento?: string | null
          data_hora_afere?: string | null
          data_hora_impressao?: string | null
          data_inicio_procedimento?: string | null
          data_nascimento?: string | null
          deambulacao?: string | null
          descricao_cirurgica?: string | null
          descricao_complicacoes?: string | null
          diagnostico_pos_operatorio?: string | null
          diagnostico_pre_igual_pos?: boolean | null
          diagnostico_pre_operatorio?: string | null
          dieta?: string | null
          dthr_admissao?: string | null
          equipe?: Json | null
          hora_fim_procedimento?: string | null
          hora_inicio_procedimento?: string | null
          houve_complicacoes?: boolean | null
          id?: string
          idade?: number | null
          leito?: string | null
          materiais?: Json | null
          matricula?: string | null
          nome_social?: string | null
          observacoes_adicionais?: string | null
          outras_orientacoes?: string | null
          possui_peca_anatomo?: boolean | null
          previsao_alta?: string | null
          procedimentos?: Json | null
          profilaxia_tev_tvp?: string | null
          prontuario?: string | null
          registro?: string | null
          registro_civil?: string | null
          sangramento_estimado?: string | null
          setor?: string | null
          sexo?: string | null
          status?: string | null
          storage_folder?: string | null
          tipo_cirurgia?: string | null
          troca_curativo?: string | null
          updated_at?: string | null
          user_id: string
          uso_antibioticos?: string | null
          usuario_impressao?: string | null
        }
        Update: {
          acompanhamento_pela_instituicao?: boolean | null
          cirurgiao_responsavel?: string | null
          cirurgiao_responsavel_crm?: string | null
          convenio_plano?: string | null
          cpf?: string | null
          created_at?: string | null
          data_fim_procedimento?: string | null
          data_hora_afere?: string | null
          data_hora_impressao?: string | null
          data_inicio_procedimento?: string | null
          data_nascimento?: string | null
          deambulacao?: string | null
          descricao_cirurgica?: string | null
          descricao_complicacoes?: string | null
          diagnostico_pos_operatorio?: string | null
          diagnostico_pre_igual_pos?: boolean | null
          diagnostico_pre_operatorio?: string | null
          dieta?: string | null
          dthr_admissao?: string | null
          equipe?: Json | null
          hora_fim_procedimento?: string | null
          hora_inicio_procedimento?: string | null
          houve_complicacoes?: boolean | null
          id?: string
          idade?: number | null
          leito?: string | null
          materiais?: Json | null
          matricula?: string | null
          nome_social?: string | null
          observacoes_adicionais?: string | null
          outras_orientacoes?: string | null
          possui_peca_anatomo?: boolean | null
          previsao_alta?: string | null
          procedimentos?: Json | null
          profilaxia_tev_tvp?: string | null
          prontuario?: string | null
          registro?: string | null
          registro_civil?: string | null
          sangramento_estimado?: string | null
          setor?: string | null
          sexo?: string | null
          status?: string | null
          storage_folder?: string | null
          tipo_cirurgia?: string | null
          troca_curativo?: string | null
          updated_at?: string | null
          user_id?: string
          uso_antibioticos?: string | null
          usuario_impressao?: string | null
        }
        Relationships: []
      }
      descricoes_cirurgicas_arquivos: {
        Row: {
          created_at: string | null
          descricao_id: string
          file_path: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao_id: string
          file_path: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao_id?: string
          file_path?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "descricoes_cirurgicas_arquivos_descricao_id_fkey"
            columns: ["descricao_id"]
            isOneToOne: false
            referencedRelation: "descricoes_cirurgicas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_consistencia: {
        Row: {
          check_grupo: string
          check_id: string
          check_label: string
          check_stage: string
          confianca_ia: number | null
          created_at: string
          detalhe: string | null
          documento_a: string | null
          documento_b: string | null
          faturamento_id: string
          id: string
          ignorado_em: string | null
          ignorado_pelo_usuario: boolean
          medico_id: string
          status: Database["public"]["Enums"]["consistencia_status"]
          updated_at: string
          valor_a: string | null
          valor_b: string | null
        }
        Insert: {
          check_grupo: string
          check_id: string
          check_label: string
          check_stage: string
          confianca_ia?: number | null
          created_at?: string
          detalhe?: string | null
          documento_a?: string | null
          documento_b?: string | null
          faturamento_id: string
          id?: string
          ignorado_em?: string | null
          ignorado_pelo_usuario?: boolean
          medico_id: string
          status: Database["public"]["Enums"]["consistencia_status"]
          updated_at?: string
          valor_a?: string | null
          valor_b?: string | null
        }
        Update: {
          check_grupo?: string
          check_id?: string
          check_label?: string
          check_stage?: string
          confianca_ia?: number | null
          created_at?: string
          detalhe?: string | null
          documento_a?: string | null
          documento_b?: string | null
          faturamento_id?: string
          id?: string
          ignorado_em?: string | null
          ignorado_pelo_usuario?: boolean
          medico_id?: string
          status?: Database["public"]["Enums"]["consistencia_status"]
          updated_at?: string
          valor_a?: string | null
          valor_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_consistencia_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamentos: {
        Row: {
          anestesista_crm: string | null
          anestesista_nome: string | null
          assinatura_medica: boolean | null
          atuou_como: string | null
          auxiliar1_crm: string | null
          auxiliar1_nome: string | null
          auxiliar2_crm: string | null
          auxiliar2_nome: string | null
          auxiliar3_crm: string | null
          auxiliar3_nome: string | null
          carater_cirurgia: string | null
          cirurgiao_principal_cbo: string | null
          cirurgiao_principal_crm: string | null
          cirurgiao_principal_nome: string | null
          cirurgiao_principal_uf: string | null
          created_at: string
          data_assinatura: string | null
          data_atendimento: string | null
          data_cirurgia: string | null
          data_emissao: string | null
          data_fim_faturamento: string | null
          data_inicio_faturamento: string | null
          data_pagamento: string | null
          diagnostico_cid: string | null
          diagnostico_descricao: string | null
          email_enviado_em: string | null
          email_status: string
          forma_pagamento: string | null
          grau_participacao: string | null
          guia_honorarios_id: string | null
          guia_solicitacao_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          hospital_codigo_cnes: string | null
          hospital_nome: string | null
          id: string
          instituicao_cirurgia_id: string | null
          instituicao_faturamento_id: string | null
          instrumentador_crm: string | null
          instrumentador_nome: string | null
          medico_id: string
          numero_autorizacao: string | null
          numero_guia_honorarios: string | null
          numero_guia_internacao: string | null
          paciente_carteirinha: string | null
          paciente_convenio: string | null
          paciente_cpf: string | null
          paciente_nome: string | null
          quantidade_procedimentos_realizados: number | null
          status: string
          status_pagamento: Database["public"]["Enums"]["faturamento_status_pagamento"]
          tipo_cirurgia: string | null
          updated_at: string
          url_descricao_cirurgica: string[]
          url_guia_autorizacao: string[]
          url_guia_honorarios: string[]
          url_relatorio_analitico: string[]
          valor_total_desconto: number
          valor_total_faturado: number
          valor_total_glosa: number
          valor_total_honorarios: number | null
          valor_total_liquido: number
          valor_total_repasse: number
        }
        Insert: {
          anestesista_crm?: string | null
          anestesista_nome?: string | null
          assinatura_medica?: boolean | null
          atuou_como?: string | null
          auxiliar1_crm?: string | null
          auxiliar1_nome?: string | null
          auxiliar2_crm?: string | null
          auxiliar2_nome?: string | null
          auxiliar3_crm?: string | null
          auxiliar3_nome?: string | null
          carater_cirurgia?: string | null
          cirurgiao_principal_cbo?: string | null
          cirurgiao_principal_crm?: string | null
          cirurgiao_principal_nome?: string | null
          cirurgiao_principal_uf?: string | null
          created_at?: string
          data_assinatura?: string | null
          data_atendimento?: string | null
          data_cirurgia?: string | null
          data_emissao?: string | null
          data_fim_faturamento?: string | null
          data_inicio_faturamento?: string | null
          data_pagamento?: string | null
          diagnostico_cid?: string | null
          diagnostico_descricao?: string | null
          email_enviado_em?: string | null
          email_status?: string
          forma_pagamento?: string | null
          grau_participacao?: string | null
          guia_honorarios_id?: string | null
          guia_solicitacao_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          hospital_codigo_cnes?: string | null
          hospital_nome?: string | null
          id?: string
          instituicao_cirurgia_id?: string | null
          instituicao_faturamento_id?: string | null
          instrumentador_crm?: string | null
          instrumentador_nome?: string | null
          medico_id: string
          numero_autorizacao?: string | null
          numero_guia_honorarios?: string | null
          numero_guia_internacao?: string | null
          paciente_carteirinha?: string | null
          paciente_convenio?: string | null
          paciente_cpf?: string | null
          paciente_nome?: string | null
          quantidade_procedimentos_realizados?: number | null
          status?: string
          status_pagamento?: Database["public"]["Enums"]["faturamento_status_pagamento"]
          tipo_cirurgia?: string | null
          updated_at?: string
          url_descricao_cirurgica?: string[]
          url_guia_autorizacao?: string[]
          url_guia_honorarios?: string[]
          url_relatorio_analitico?: string[]
          valor_total_desconto?: number
          valor_total_faturado?: number
          valor_total_glosa?: number
          valor_total_honorarios?: number | null
          valor_total_liquido?: number
          valor_total_repasse?: number
        }
        Update: {
          anestesista_crm?: string | null
          anestesista_nome?: string | null
          assinatura_medica?: boolean | null
          atuou_como?: string | null
          auxiliar1_crm?: string | null
          auxiliar1_nome?: string | null
          auxiliar2_crm?: string | null
          auxiliar2_nome?: string | null
          auxiliar3_crm?: string | null
          auxiliar3_nome?: string | null
          carater_cirurgia?: string | null
          cirurgiao_principal_cbo?: string | null
          cirurgiao_principal_crm?: string | null
          cirurgiao_principal_nome?: string | null
          cirurgiao_principal_uf?: string | null
          created_at?: string
          data_assinatura?: string | null
          data_atendimento?: string | null
          data_cirurgia?: string | null
          data_emissao?: string | null
          data_fim_faturamento?: string | null
          data_inicio_faturamento?: string | null
          data_pagamento?: string | null
          diagnostico_cid?: string | null
          diagnostico_descricao?: string | null
          email_enviado_em?: string | null
          email_status?: string
          forma_pagamento?: string | null
          grau_participacao?: string | null
          guia_honorarios_id?: string | null
          guia_solicitacao_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          hospital_codigo_cnes?: string | null
          hospital_nome?: string | null
          id?: string
          instituicao_cirurgia_id?: string | null
          instituicao_faturamento_id?: string | null
          instrumentador_crm?: string | null
          instrumentador_nome?: string | null
          medico_id?: string
          numero_autorizacao?: string | null
          numero_guia_honorarios?: string | null
          numero_guia_internacao?: string | null
          paciente_carteirinha?: string | null
          paciente_convenio?: string | null
          paciente_cpf?: string | null
          paciente_nome?: string | null
          quantidade_procedimentos_realizados?: number | null
          status?: string
          status_pagamento?: Database["public"]["Enums"]["faturamento_status_pagamento"]
          tipo_cirurgia?: string | null
          updated_at?: string
          url_descricao_cirurgica?: string[]
          url_guia_autorizacao?: string[]
          url_guia_honorarios?: string[]
          url_relatorio_analitico?: string[]
          valor_total_desconto?: number
          valor_total_faturado?: number
          valor_total_glosa?: number
          valor_total_honorarios?: number | null
          valor_total_liquido?: number
          valor_total_repasse?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_guia_honorarios_id_fkey"
            columns: ["guia_honorarios_id"]
            isOneToOne: false
            referencedRelation: "guia_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_guia_solicitacao_id_fkey"
            columns: ["guia_solicitacao_id"]
            isOneToOne: false
            referencedRelation: "guia_solicitacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_instituicao_cirurgia_id_fkey"
            columns: ["instituicao_cirurgia_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_instituicao_faturamento_id_fkey"
            columns: ["instituicao_faturamento_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      guia_honorarios: {
        Row: {
          clinica_id: string | null
          convenio: string | null
          created_at: string | null
          data: string | null
          equipe_anestesista_cod_sist: string | null
          equipe_anestesista_cpf: string | null
          equipe_anestesista_crm: string | null
          equipe_anestesista_medico: string | null
          equipe_aux1_cod_sist: string | null
          equipe_aux1_cpf: string | null
          equipe_aux1_crm: string | null
          equipe_aux1_medico: string | null
          equipe_aux2_cod_sist: string | null
          equipe_aux2_cpf: string | null
          equipe_aux2_crm: string | null
          equipe_aux2_medico: string | null
          equipe_aux3_cod_sist: string | null
          equipe_aux3_cpf: string | null
          equipe_aux3_crm: string | null
          equipe_aux3_medico: string | null
          equipe_cirurgiao_cod_sist: string | null
          equipe_cirurgiao_cpf: string | null
          equipe_cirurgiao_crm: string | null
          equipe_cirurgiao_medico: string | null
          equipe_instrumentador_cod_sist: string | null
          equipe_instrumentador_cpf: string | null
          equipe_instrumentador_crm: string | null
          equipe_instrumentador_medico: string | null
          equipe_perfusionista_cod_sist: string | null
          equipe_perfusionista_cpf: string | null
          equipe_perfusionista_crm: string | null
          equipe_perfusionista_medico: string | null
          hora: string | null
          html_preenchido: string | null
          id: string
          medico_id: string | null
          modelo_id: string | null
          paciente_leito: string | null
          paciente_nome: string | null
          paciente_registro: string | null
          pdf_guia_honorario: string | null
          proc_cir_1_amb_cbhpm: string | null
          proc_cir_1_cod_sistema: string | null
          proc_cir_1_descricao: string | null
          proc_cir_1_via_acesso: string | null
          proc_cir_2_amb_cbhpm: string | null
          proc_cir_2_cod_sistema: string | null
          proc_cir_2_descricao: string | null
          proc_cir_2_via_acesso: string | null
          proc_cir_3_amb_cbhpm: string | null
          proc_cir_3_cod_sistema: string | null
          proc_cir_3_descricao: string | null
          proc_cir_3_via_acesso: string | null
          proc_cir_4_amb_cbhpm: string | null
          proc_cir_4_cod_sistema: string | null
          proc_cir_4_descricao: string | null
          proc_cir_4_via_acesso: string | null
          proc_cir_5_amb_cbhpm: string | null
          proc_cir_5_cod_sistema: string | null
          proc_cir_5_descricao: string | null
          proc_cir_5_via_acesso: string | null
          proc_med_extra1_amb_cbhpm: string | null
          proc_med_extra1_cod_sistema: string | null
          proc_med_extra1_desc: string | null
          proc_med_extra1_qtd: string | null
          proc_med_extra2_amb_cbhpm: string | null
          proc_med_extra2_cod_sistema: string | null
          proc_med_extra2_desc: string | null
          proc_med_extra2_qtd: string | null
          proc_med_outros_amb_cbhpm: string | null
          proc_med_outros_cod_sistema: string | null
          proc_med_outros_qtd: string | null
          proc_med_parecer_cod_sistema: string | null
          proc_med_parecer_qtd: string | null
          proc_med_visita_cod_sistema: string | null
          proc_med_visita_qtd: string | null
          profissional_cod_sist: string | null
          profissional_crm: string | null
          profissional_nome: string | null
          updated_at: string | null
        }
        Insert: {
          clinica_id?: string | null
          convenio?: string | null
          created_at?: string | null
          data?: string | null
          equipe_anestesista_cod_sist?: string | null
          equipe_anestesista_cpf?: string | null
          equipe_anestesista_crm?: string | null
          equipe_anestesista_medico?: string | null
          equipe_aux1_cod_sist?: string | null
          equipe_aux1_cpf?: string | null
          equipe_aux1_crm?: string | null
          equipe_aux1_medico?: string | null
          equipe_aux2_cod_sist?: string | null
          equipe_aux2_cpf?: string | null
          equipe_aux2_crm?: string | null
          equipe_aux2_medico?: string | null
          equipe_aux3_cod_sist?: string | null
          equipe_aux3_cpf?: string | null
          equipe_aux3_crm?: string | null
          equipe_aux3_medico?: string | null
          equipe_cirurgiao_cod_sist?: string | null
          equipe_cirurgiao_cpf?: string | null
          equipe_cirurgiao_crm?: string | null
          equipe_cirurgiao_medico?: string | null
          equipe_instrumentador_cod_sist?: string | null
          equipe_instrumentador_cpf?: string | null
          equipe_instrumentador_crm?: string | null
          equipe_instrumentador_medico?: string | null
          equipe_perfusionista_cod_sist?: string | null
          equipe_perfusionista_cpf?: string | null
          equipe_perfusionista_crm?: string | null
          equipe_perfusionista_medico?: string | null
          hora?: string | null
          html_preenchido?: string | null
          id?: string
          medico_id?: string | null
          modelo_id?: string | null
          paciente_leito?: string | null
          paciente_nome?: string | null
          paciente_registro?: string | null
          pdf_guia_honorario?: string | null
          proc_cir_1_amb_cbhpm?: string | null
          proc_cir_1_cod_sistema?: string | null
          proc_cir_1_descricao?: string | null
          proc_cir_1_via_acesso?: string | null
          proc_cir_2_amb_cbhpm?: string | null
          proc_cir_2_cod_sistema?: string | null
          proc_cir_2_descricao?: string | null
          proc_cir_2_via_acesso?: string | null
          proc_cir_3_amb_cbhpm?: string | null
          proc_cir_3_cod_sistema?: string | null
          proc_cir_3_descricao?: string | null
          proc_cir_3_via_acesso?: string | null
          proc_cir_4_amb_cbhpm?: string | null
          proc_cir_4_cod_sistema?: string | null
          proc_cir_4_descricao?: string | null
          proc_cir_4_via_acesso?: string | null
          proc_cir_5_amb_cbhpm?: string | null
          proc_cir_5_cod_sistema?: string | null
          proc_cir_5_descricao?: string | null
          proc_cir_5_via_acesso?: string | null
          proc_med_extra1_amb_cbhpm?: string | null
          proc_med_extra1_cod_sistema?: string | null
          proc_med_extra1_desc?: string | null
          proc_med_extra1_qtd?: string | null
          proc_med_extra2_amb_cbhpm?: string | null
          proc_med_extra2_cod_sistema?: string | null
          proc_med_extra2_desc?: string | null
          proc_med_extra2_qtd?: string | null
          proc_med_outros_amb_cbhpm?: string | null
          proc_med_outros_cod_sistema?: string | null
          proc_med_outros_qtd?: string | null
          proc_med_parecer_cod_sistema?: string | null
          proc_med_parecer_qtd?: string | null
          proc_med_visita_cod_sistema?: string | null
          proc_med_visita_qtd?: string | null
          profissional_cod_sist?: string | null
          profissional_crm?: string | null
          profissional_nome?: string | null
          updated_at?: string | null
        }
        Update: {
          clinica_id?: string | null
          convenio?: string | null
          created_at?: string | null
          data?: string | null
          equipe_anestesista_cod_sist?: string | null
          equipe_anestesista_cpf?: string | null
          equipe_anestesista_crm?: string | null
          equipe_anestesista_medico?: string | null
          equipe_aux1_cod_sist?: string | null
          equipe_aux1_cpf?: string | null
          equipe_aux1_crm?: string | null
          equipe_aux1_medico?: string | null
          equipe_aux2_cod_sist?: string | null
          equipe_aux2_cpf?: string | null
          equipe_aux2_crm?: string | null
          equipe_aux2_medico?: string | null
          equipe_aux3_cod_sist?: string | null
          equipe_aux3_cpf?: string | null
          equipe_aux3_crm?: string | null
          equipe_aux3_medico?: string | null
          equipe_cirurgiao_cod_sist?: string | null
          equipe_cirurgiao_cpf?: string | null
          equipe_cirurgiao_crm?: string | null
          equipe_cirurgiao_medico?: string | null
          equipe_instrumentador_cod_sist?: string | null
          equipe_instrumentador_cpf?: string | null
          equipe_instrumentador_crm?: string | null
          equipe_instrumentador_medico?: string | null
          equipe_perfusionista_cod_sist?: string | null
          equipe_perfusionista_cpf?: string | null
          equipe_perfusionista_crm?: string | null
          equipe_perfusionista_medico?: string | null
          hora?: string | null
          html_preenchido?: string | null
          id?: string
          medico_id?: string | null
          modelo_id?: string | null
          paciente_leito?: string | null
          paciente_nome?: string | null
          paciente_registro?: string | null
          pdf_guia_honorario?: string | null
          proc_cir_1_amb_cbhpm?: string | null
          proc_cir_1_cod_sistema?: string | null
          proc_cir_1_descricao?: string | null
          proc_cir_1_via_acesso?: string | null
          proc_cir_2_amb_cbhpm?: string | null
          proc_cir_2_cod_sistema?: string | null
          proc_cir_2_descricao?: string | null
          proc_cir_2_via_acesso?: string | null
          proc_cir_3_amb_cbhpm?: string | null
          proc_cir_3_cod_sistema?: string | null
          proc_cir_3_descricao?: string | null
          proc_cir_3_via_acesso?: string | null
          proc_cir_4_amb_cbhpm?: string | null
          proc_cir_4_cod_sistema?: string | null
          proc_cir_4_descricao?: string | null
          proc_cir_4_via_acesso?: string | null
          proc_cir_5_amb_cbhpm?: string | null
          proc_cir_5_cod_sistema?: string | null
          proc_cir_5_descricao?: string | null
          proc_cir_5_via_acesso?: string | null
          proc_med_extra1_amb_cbhpm?: string | null
          proc_med_extra1_cod_sistema?: string | null
          proc_med_extra1_desc?: string | null
          proc_med_extra1_qtd?: string | null
          proc_med_extra2_amb_cbhpm?: string | null
          proc_med_extra2_cod_sistema?: string | null
          proc_med_extra2_desc?: string | null
          proc_med_extra2_qtd?: string | null
          proc_med_outros_amb_cbhpm?: string | null
          proc_med_outros_cod_sistema?: string | null
          proc_med_outros_qtd?: string | null
          proc_med_parecer_cod_sistema?: string | null
          proc_med_parecer_qtd?: string | null
          proc_med_visita_cod_sistema?: string | null
          proc_med_visita_qtd?: string | null
          profissional_cod_sist?: string | null
          profissional_crm?: string | null
          profissional_nome?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guia_honorarios_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guia_honorarios_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelo_guia_faturamento"
            referencedColumns: ["id"]
          },
        ]
      }
      guia_solicitacao: {
        Row: {
          atendimento_rn: string | null
          contratado_cnes: string | null
          contratado_codigo_operadora: string | null
          contratado_nome: string | null
          created_at: string
          data_emissao: string | null
          data_fim_faturamento: string | null
          data_inicio_faturamento: string | null
          executante_cnes: string | null
          executante_codigo_operadora: string | null
          executante_nome: string | null
          id: string
          medico_id: string
          nome_beneficiario: string | null
          nome_social: string | null
          numero_carteira: string | null
          numero_guia_operadora: string | null
          numero_guia_prestador: string | null
          numero_guia_solicitacao: string | null
          observacao: string | null
          profissional_cbo: string | null
          profissional_conselho_codigo: string | null
          profissional_cpf: string | null
          profissional_grau_participacao: string | null
          profissional_nome: string | null
          profissional_numero_conselho: string | null
          profissional_seq_ref: string | null
          profissional_uf: string | null
          registro_ans: string | null
          senha: string | null
          updated_at: string
          url_documentos: string[]
          valor_total_faturamento: number | null
          valor_total_honorarios: number | null
        }
        Insert: {
          atendimento_rn?: string | null
          contratado_cnes?: string | null
          contratado_codigo_operadora?: string | null
          contratado_nome?: string | null
          created_at?: string
          data_emissao?: string | null
          data_fim_faturamento?: string | null
          data_inicio_faturamento?: string | null
          executante_cnes?: string | null
          executante_codigo_operadora?: string | null
          executante_nome?: string | null
          id?: string
          medico_id: string
          nome_beneficiario?: string | null
          nome_social?: string | null
          numero_carteira?: string | null
          numero_guia_operadora?: string | null
          numero_guia_prestador?: string | null
          numero_guia_solicitacao?: string | null
          observacao?: string | null
          profissional_cbo?: string | null
          profissional_conselho_codigo?: string | null
          profissional_cpf?: string | null
          profissional_grau_participacao?: string | null
          profissional_nome?: string | null
          profissional_numero_conselho?: string | null
          profissional_seq_ref?: string | null
          profissional_uf?: string | null
          registro_ans?: string | null
          senha?: string | null
          updated_at?: string
          url_documentos?: string[]
          valor_total_faturamento?: number | null
          valor_total_honorarios?: number | null
        }
        Update: {
          atendimento_rn?: string | null
          contratado_cnes?: string | null
          contratado_codigo_operadora?: string | null
          contratado_nome?: string | null
          created_at?: string
          data_emissao?: string | null
          data_fim_faturamento?: string | null
          data_inicio_faturamento?: string | null
          executante_cnes?: string | null
          executante_codigo_operadora?: string | null
          executante_nome?: string | null
          id?: string
          medico_id?: string
          nome_beneficiario?: string | null
          nome_social?: string | null
          numero_carteira?: string | null
          numero_guia_operadora?: string | null
          numero_guia_prestador?: string | null
          numero_guia_solicitacao?: string | null
          observacao?: string | null
          profissional_cbo?: string | null
          profissional_conselho_codigo?: string | null
          profissional_cpf?: string | null
          profissional_grau_participacao?: string | null
          profissional_nome?: string | null
          profissional_numero_conselho?: string | null
          profissional_seq_ref?: string | null
          profissional_uf?: string | null
          registro_ans?: string | null
          senha?: string | null
          updated_at?: string
          url_documentos?: string[]
          valor_total_faturamento?: number | null
          valor_total_honorarios?: number | null
        }
        Relationships: []
      }
      itens_faturamento: {
        Row: {
          codigo_glosa: string | null
          codigo_procedimento: string | null
          created_at: string
          data_conciliacao: string | null
          descricao_procedimento: string | null
          faturamento_id: string
          id: string
          medico_id: string | null
          motivo_glosa: string | null
          percentual_participacao: number
          percentual_repasse: number
          profissional_cbo: string | null
          profissional_crm: string | null
          profissional_nome: string | null
          profissional_uf: string | null
          quantidade: number
          quantidade_autorizada: number | null
          quantidade_executada: number | null
          quantidade_faturada: number | null
          status_item: Database["public"]["Enums"]["item_status_pagamento"]
          tipo_procedimento:
            | Database["public"]["Enums"]["item_tipo_procedimento"]
            | null
          updated_at: string
          valor_desconto: number
          valor_faturado: number
          valor_glosa: number
          valor_liquido: number
          valor_repasse: number
          valor_total_item: number
          valor_unitario: number
        }
        Insert: {
          codigo_glosa?: string | null
          codigo_procedimento?: string | null
          created_at?: string
          data_conciliacao?: string | null
          descricao_procedimento?: string | null
          faturamento_id: string
          id?: string
          medico_id?: string | null
          motivo_glosa?: string | null
          percentual_participacao?: number
          percentual_repasse?: number
          profissional_cbo?: string | null
          profissional_crm?: string | null
          profissional_nome?: string | null
          profissional_uf?: string | null
          quantidade?: number
          quantidade_autorizada?: number | null
          quantidade_executada?: number | null
          quantidade_faturada?: number | null
          status_item?: Database["public"]["Enums"]["item_status_pagamento"]
          tipo_procedimento?:
            | Database["public"]["Enums"]["item_tipo_procedimento"]
            | null
          updated_at?: string
          valor_desconto?: number
          valor_faturado?: number
          valor_glosa?: number
          valor_liquido?: number
          valor_repasse?: number
          valor_total_item?: number
          valor_unitario?: number
        }
        Update: {
          codigo_glosa?: string | null
          codigo_procedimento?: string | null
          created_at?: string
          data_conciliacao?: string | null
          descricao_procedimento?: string | null
          faturamento_id?: string
          id?: string
          medico_id?: string | null
          motivo_glosa?: string | null
          percentual_participacao?: number
          percentual_repasse?: number
          profissional_cbo?: string | null
          profissional_crm?: string | null
          profissional_nome?: string | null
          profissional_uf?: string | null
          quantidade?: number
          quantidade_autorizada?: number | null
          quantidade_executada?: number | null
          quantidade_faturada?: number | null
          status_item?: Database["public"]["Enums"]["item_status_pagamento"]
          tipo_procedimento?:
            | Database["public"]["Enums"]["item_tipo_procedimento"]
            | null
          updated_at?: string
          valor_desconto?: number
          valor_faturado?: number
          valor_glosa?: number
          valor_liquido?: number
          valor_repasse?: number
          valor_total_item?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_faturamento_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_guia_solicitacao: {
        Row: {
          codigo_procedimento: string | null
          codigo_tabela: string | null
          created_at: string
          data_procedimento: string | null
          descricao_procedimento: string | null
          guia_id: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          percentual_reducao_acrescimo: number | null
          quantidade: number | null
          tecnica_utilizada: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
          via_acesso: string | null
        }
        Insert: {
          codigo_procedimento?: string | null
          codigo_tabela?: string | null
          created_at?: string
          data_procedimento?: string | null
          descricao_procedimento?: string | null
          guia_id: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          percentual_reducao_acrescimo?: number | null
          quantidade?: number | null
          tecnica_utilizada?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          via_acesso?: string | null
        }
        Update: {
          codigo_procedimento?: string | null
          codigo_tabela?: string | null
          created_at?: string
          data_procedimento?: string | null
          descricao_procedimento?: string | null
          guia_id?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          percentual_reducao_acrescimo?: number | null
          quantidade?: number | null
          tecnica_utilizada?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          via_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_guia_solicitacao_guia_id_fkey"
            columns: ["guia_id"]
            isOneToOne: false
            referencedRelation: "guia_solicitacao"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_relatorio_retorno: {
        Row: {
          codigo_procedimento: string | null
          convenio: string | null
          created_at: string | null
          data_atendimento: string | null
          data_pagamento: string | null
          data_realizacao: string | null
          descricao_procedimento: string | null
          funcao_profissional: string | null
          hospital_local: string | null
          id: string
          motivo_glosa: string | null
          numero_conta: string | null
          numero_guia: string | null
          observacoes: string | null
          ordem: number | null
          paciente_carteira: string | null
          paciente_nome: string | null
          plano: string | null
          quantidade: number | null
          relatorio_id: string
          user_id: string
          valor_apresentado: number | null
          valor_base: number | null
          valor_desconto: number | null
          valor_glosa: number | null
          valor_imposto: number | null
          valor_liquido: number | null
        }
        Insert: {
          codigo_procedimento?: string | null
          convenio?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          descricao_procedimento?: string | null
          funcao_profissional?: string | null
          hospital_local?: string | null
          id?: string
          motivo_glosa?: string | null
          numero_conta?: string | null
          numero_guia?: string | null
          observacoes?: string | null
          ordem?: number | null
          paciente_carteira?: string | null
          paciente_nome?: string | null
          plano?: string | null
          quantidade?: number | null
          relatorio_id: string
          user_id: string
          valor_apresentado?: number | null
          valor_base?: number | null
          valor_desconto?: number | null
          valor_glosa?: number | null
          valor_imposto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          codigo_procedimento?: string | null
          convenio?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          descricao_procedimento?: string | null
          funcao_profissional?: string | null
          hospital_local?: string | null
          id?: string
          motivo_glosa?: string | null
          numero_conta?: string | null
          numero_guia?: string | null
          observacoes?: string | null
          ordem?: number | null
          paciente_carteira?: string | null
          paciente_nome?: string | null
          plano?: string | null
          quantidade?: number | null
          relatorio_id?: string
          user_id?: string
          valor_apresentado?: number | null
          valor_base?: number | null
          valor_desconto?: number | null
          valor_glosa?: number | null
          valor_imposto?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_relatorio_retorno_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios_retorno"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_sadt_acompanhamento: {
        Row: {
          codigo_procedimento: string | null
          codigo_tabela: string | null
          created_at: string
          data_procedimento: string | null
          descricao_procedimento: string | null
          hora_final: string | null
          hora_inicial: string | null
          id: string
          percentual_reducao_acrescimo: number | null
          quantidade: number | null
          sadt_id: string
          tecnica_utilizada: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
          via_acesso: string | null
        }
        Insert: {
          codigo_procedimento?: string | null
          codigo_tabela?: string | null
          created_at?: string
          data_procedimento?: string | null
          descricao_procedimento?: string | null
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          percentual_reducao_acrescimo?: number | null
          quantidade?: number | null
          sadt_id: string
          tecnica_utilizada?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          via_acesso?: string | null
        }
        Update: {
          codigo_procedimento?: string | null
          codigo_tabela?: string | null
          created_at?: string
          data_procedimento?: string | null
          descricao_procedimento?: string | null
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          percentual_reducao_acrescimo?: number | null
          quantidade?: number | null
          sadt_id?: string
          tecnica_utilizada?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          via_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_sadt_acompanhamento_sadt_id_fkey"
            columns: ["sadt_id"]
            isOneToOne: false
            referencedRelation: "sadt_acompanhamento"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          clinicas_ids: string[]
          created_at: string
          crm: string | null
          email: string
          hospitais_ids: string[]
          id: string
          nome: string
          telefone_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          clinicas_ids?: string[]
          created_at?: string
          crm?: string | null
          email: string
          hospitais_ids?: string[]
          id: string
          nome: string
          telefone_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          clinicas_ids?: string[]
          created_at?: string
          crm?: string | null
          email?: string
          hospitais_ids?: string[]
          id?: string
          nome?: string
          telefone_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medicos_clinicas_favoritas: {
        Row: {
          clinica_id: string
          created_at: string | null
          id: string
          medico_id: string
        }
        Insert: {
          clinica_id: string
          created_at?: string | null
          id?: string
          medico_id: string
        }
        Update: {
          clinica_id?: string
          created_at?: string | null
          id?: string
          medico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicos_clinicas_favoritas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_guia_faturamento: {
        Row: {
          arquivo_modelo_path: string | null
          clinicas_ids: string[] | null
          created_at: string
          html_documento: string | null
          id: string
          nome_guia: string
          updated_at: string
        }
        Insert: {
          arquivo_modelo_path?: string | null
          clinicas_ids?: string[] | null
          created_at?: string
          html_documento?: string | null
          id?: string
          nome_guia: string
          updated_at?: string
        }
        Update: {
          arquivo_modelo_path?: string | null
          clinicas_ids?: string[] | null
          created_at?: string
          html_documento?: string | null
          id?: string
          nome_guia?: string
          updated_at?: string
        }
        Relationships: []
      }
      modelos_descricao_cirurgica: {
        Row: {
          ativo: boolean
          campo_procedimentos: string | null
          created_at: string | null
          descricao: string | null
          id: string
          imagem_descricao_path: string | null
          imagem_destaque_path: string | null
          instrucao_ia: string | null
          nome: string
          tipo_documento: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          campo_procedimentos?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem_descricao_path?: string | null
          imagem_destaque_path?: string | null
          instrucao_ia?: string | null
          nome: string
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          campo_procedimentos?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem_descricao_path?: string | null
          imagem_destaque_path?: string | null
          instrucao_ia?: string | null
          nome?: string
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      modelos_email_faturamento: {
        Row: {
          assunto: string
          corpo_html: string
          created_at: string
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          assunto: string
          corpo_html: string
          created_at?: string
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          corpo_html?: string
          created_at?: string
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      openai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          edge_function: string
          estimated_cost_usd: number | null
          faturamento_id: string | null
          id: string
          model: string
          prompt_tokens: number
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          edge_function: string
          estimated_cost_usd?: number | null
          faturamento_id?: string | null
          id?: string
          model: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          edge_function?: string
          estimated_cost_usd?: number | null
          faturamento_id?: string | null
          id?: string
          model?: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      relatorios_retorno: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          clinica_hospital: string | null
          competencia: string | null
          created_at: string | null
          data_pagamento: string | null
          id: string
          medico_crm: string | null
          medico_especialidade: string | null
          medico_funcao: string | null
          medico_nome: string | null
          origem: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          raw_extracao: Json | null
          total_bruto: number | null
          total_desconto: number | null
          total_glosa: number | null
          total_imposto: number | null
          total_liquido: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          clinica_hospital?: string | null
          competencia?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          id?: string
          medico_crm?: string | null
          medico_especialidade?: string | null
          medico_funcao?: string | null
          medico_nome?: string | null
          origem?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          raw_extracao?: Json | null
          total_bruto?: number | null
          total_desconto?: number | null
          total_glosa?: number | null
          total_imposto?: number | null
          total_liquido?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          clinica_hospital?: string | null
          competencia?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          id?: string
          medico_crm?: string | null
          medico_especialidade?: string | null
          medico_funcao?: string | null
          medico_nome?: string | null
          origem?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          raw_extracao?: Json | null
          total_bruto?: number | null
          total_desconto?: number | null
          total_glosa?: number | null
          total_imposto?: number | null
          total_liquido?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sadt_acompanhamento: {
        Row: {
          atendimento_rn: string | null
          carater_atendimento: string | null
          created_at: string
          data_autorizacao: string | null
          data_emissao: string | null
          data_fim_atendimento: string | null
          data_inicio_atendimento: string | null
          data_solicitacao: string | null
          data_validade_senha: string | null
          executante_cnes: string | null
          executante_codigo_operadora: string | null
          executante_nome: string | null
          id: string
          indicacao_acidente: string | null
          indicacao_clinica: string | null
          medico_id: string
          motivo_encerramento: string | null
          nome_beneficiario: string | null
          nome_social: string | null
          numero_carteira: string | null
          numero_guia_operadora: string | null
          numero_guia_prestador: string | null
          numero_guia_sadt: string | null
          observacao: string | null
          profissional_cbo: string | null
          profissional_conselho_codigo: string | null
          profissional_cpf: string | null
          profissional_grau_participacao: string | null
          profissional_nome: string | null
          profissional_numero_conselho: string | null
          profissional_seq_ref: string | null
          profissional_uf: string | null
          registro_ans: string | null
          senha: string | null
          solicitante_cnes: string | null
          solicitante_codigo_operadora: string | null
          solicitante_nome: string | null
          solicitante_profissional_cbo: string | null
          solicitante_profissional_conselho_codigo: string | null
          solicitante_profissional_nome: string | null
          solicitante_profissional_numero_conselho: string | null
          solicitante_profissional_uf: string | null
          tipo_atendimento: string | null
          tipo_consulta: string | null
          updated_at: string
          url_documentos: string[]
          valor_total_geral: number | null
          valor_total_materiais: number | null
          valor_total_medicamentos: number | null
          valor_total_procedimentos: number | null
          valor_total_taxas: number | null
        }
        Insert: {
          atendimento_rn?: string | null
          carater_atendimento?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao?: string | null
          data_fim_atendimento?: string | null
          data_inicio_atendimento?: string | null
          data_solicitacao?: string | null
          data_validade_senha?: string | null
          executante_cnes?: string | null
          executante_codigo_operadora?: string | null
          executante_nome?: string | null
          id?: string
          indicacao_acidente?: string | null
          indicacao_clinica?: string | null
          medico_id: string
          motivo_encerramento?: string | null
          nome_beneficiario?: string | null
          nome_social?: string | null
          numero_carteira?: string | null
          numero_guia_operadora?: string | null
          numero_guia_prestador?: string | null
          numero_guia_sadt?: string | null
          observacao?: string | null
          profissional_cbo?: string | null
          profissional_conselho_codigo?: string | null
          profissional_cpf?: string | null
          profissional_grau_participacao?: string | null
          profissional_nome?: string | null
          profissional_numero_conselho?: string | null
          profissional_seq_ref?: string | null
          profissional_uf?: string | null
          registro_ans?: string | null
          senha?: string | null
          solicitante_cnes?: string | null
          solicitante_codigo_operadora?: string | null
          solicitante_nome?: string | null
          solicitante_profissional_cbo?: string | null
          solicitante_profissional_conselho_codigo?: string | null
          solicitante_profissional_nome?: string | null
          solicitante_profissional_numero_conselho?: string | null
          solicitante_profissional_uf?: string | null
          tipo_atendimento?: string | null
          tipo_consulta?: string | null
          updated_at?: string
          url_documentos?: string[]
          valor_total_geral?: number | null
          valor_total_materiais?: number | null
          valor_total_medicamentos?: number | null
          valor_total_procedimentos?: number | null
          valor_total_taxas?: number | null
        }
        Update: {
          atendimento_rn?: string | null
          carater_atendimento?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao?: string | null
          data_fim_atendimento?: string | null
          data_inicio_atendimento?: string | null
          data_solicitacao?: string | null
          data_validade_senha?: string | null
          executante_cnes?: string | null
          executante_codigo_operadora?: string | null
          executante_nome?: string | null
          id?: string
          indicacao_acidente?: string | null
          indicacao_clinica?: string | null
          medico_id?: string
          motivo_encerramento?: string | null
          nome_beneficiario?: string | null
          nome_social?: string | null
          numero_carteira?: string | null
          numero_guia_operadora?: string | null
          numero_guia_prestador?: string | null
          numero_guia_sadt?: string | null
          observacao?: string | null
          profissional_cbo?: string | null
          profissional_conselho_codigo?: string | null
          profissional_cpf?: string | null
          profissional_grau_participacao?: string | null
          profissional_nome?: string | null
          profissional_numero_conselho?: string | null
          profissional_seq_ref?: string | null
          profissional_uf?: string | null
          registro_ans?: string | null
          senha?: string | null
          solicitante_cnes?: string | null
          solicitante_codigo_operadora?: string | null
          solicitante_nome?: string | null
          solicitante_profissional_cbo?: string | null
          solicitante_profissional_conselho_codigo?: string | null
          solicitante_profissional_nome?: string | null
          solicitante_profissional_numero_conselho?: string | null
          solicitante_profissional_uf?: string | null
          tipo_atendimento?: string | null
          tipo_consulta?: string | null
          updated_at?: string
          url_documentos?: string[]
          valor_total_geral?: number | null
          valor_total_materiais?: number | null
          valor_total_medicamentos?: number | null
          valor_total_procedimentos?: number | null
          valor_total_taxas?: number | null
        }
        Relationships: []
      }
      site_contact_messages: {
        Row: {
          city: string
          created_at: string
          email: string
          id: string
          message: string
          metadata: Json | null
          name: string
          uf: string
          whatsapp: string
        }
        Insert: {
          city: string
          created_at?: string
          email: string
          id?: string
          message: string
          metadata?: Json | null
          name: string
          uf: string
          whatsapp: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          metadata?: Json | null
          name?: string
          uf?: string
          whatsapp?: string
        }
        Relationships: []
      }
      site_leads: {
        Row: {
          activated_at: string | null
          created_at: string
          crm: string
          email: string
          id: string
          metadata: Json | null
          name: string
          phone: string
          state: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          crm: string
          email: string
          id?: string
          metadata?: Json | null
          name: string
          phone: string
          state: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          crm?: string
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
          phone?: string
          state?: string
          status?: string
        }
        Relationships: []
      }
      subscription_enrollments: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          cancelado: boolean
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          last_payment_at: string | null
          metadata: Json | null
          payment_method: string | null
          plan_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_email: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          external_plan_id: string | null
          features: Json
          id: string
          interval_count: number
          metadata: Json | null
          name: string
          price_annual: number
          price_month: number
          setup_fee_cents: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_interval: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          external_plan_id?: string | null
          features?: Json
          id?: string
          interval_count?: number
          metadata?: Json | null
          name: string
          price_annual: number
          price_month: number
          setup_fee_cents?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          external_plan_id?: string | null
          features?: Json
          id?: string
          interval_count?: number
          metadata?: Json | null
          name?: string
          price_annual?: number
          price_month?: number
          setup_fee_cents?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_avatars: {
        Row: {
          avatar_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios_sistema: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          celular: string | null
          criado_em: string
          crm: string | null
          email: string
          empresa_clinica_base: string | null
          id_user: string
          nome: string
          regra: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          celular?: string | null
          criado_em?: string
          crm?: string | null
          email: string
          empresa_clinica_base?: string | null
          id_user?: string
          nome: string
          regra: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          celular?: string | null
          criado_em?: string
          crm?: string | null
          email?: string
          empresa_clinica_base?: string | null
          id_user?: string
          nome?: string
          regra?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_email: { Args: never; Returns: string }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      list_storage_objects_for_user: {
        Args: { p_user_id: string }
        Returns: {
          bucket_id: string
          name: string
        }[]
      }
      normalize_email: { Args: { p_email: string }; Returns: string }
      purge_user_everything: { Args: { p_email: string }; Returns: Json }
      recalculate_faturamento_status: {
        Args: { p_faturamento_id: string }
        Returns: undefined
      }
      recalculate_faturamento_totals: {
        Args: { p_faturamento_id: string }
        Returns: undefined
      }
      sync_faturamento_aggregate: {
        Args: { p_faturamento_id: string }
        Returns: undefined
      }
    }
    Enums: {
      consistencia_status: "correto" | "inconsistente" | "suspeita"
      faturamento_status_pagamento:
        | "pendente"
        | "pago_integral"
        | "pago_parcial"
        | "glosado"
      item_status_pagamento:
        | "pendente"
        | "pago_integral"
        | "pago_parcial"
        | "glosado_total"
        | "glosado_parcial"
      item_tipo_procedimento: "principal" | "secundario" | "anestesia" | "sadt"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      consistencia_status: ["correto", "inconsistente", "suspeita"],
      faturamento_status_pagamento: [
        "pendente",
        "pago_integral",
        "pago_parcial",
        "glosado",
      ],
      item_status_pagamento: [
        "pendente",
        "pago_integral",
        "pago_parcial",
        "glosado_total",
        "glosado_parcial",
      ],
      item_tipo_procedimento: ["principal", "secundario", "anestesia", "sadt"],
    },
  },
} as const
