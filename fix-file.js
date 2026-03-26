import fs from 'fs';

const path = 'src/pages/MedicoUploadDescricaoCirurgica.tsx';
let content = fs.readFileSync(path, 'utf-8');

// The file currently ends abruptly around:
// {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}

const missingPart = `\`Dr. \${medicoNome},\` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesGuia.length === 0 ? (
                    <>
                      <span>
                        Faça upload das imagens da{" "}
                        <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                          Guia de Autorização de Cirurgia
                        </span>
                        .
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos da mesma
                        guia para melhor análise da IA
                      </span>
                    </>
                  ) : (
                    <>
                      Confira os arquivos antes de enviar a{" "}
                      <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                        Guia de Autorização de Cirurgia
                      </span>
                    </>
                  )}
                </p>
              </div>

              {filesGuia.length === 0 ? (
                <>
                  <label htmlFor="files-upload-guia" className="cursor-pointer rounded-2xl border-2 border-dashed border-[#D4A017]/30 bg-[#1a1a1a] p-8 text-center transition-all hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] shadow-[0_0_30px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(212,160,23,0.6)]"><Upload className="h-8 w-8 text-black" /></div>
                      <p className="font-medium text-[#F5F5F5]">Adicionar Arquivos</p>
                      <p className="text-sm text-[#9CA3AF]">Câmera ou Galeria</p>
                      <p className="text-[11px] text-[#6B7280]">Formatos aceitos: PNG, JPEG, GIF, WEBP, HEIC e PDF.</p>
                    </div>
                  </label>
                  <Button type="button" disabled className="mt-8 h-11 w-full rounded-lg border border-[#D4A017]/10 bg-black/50 text-xs font-semibold text-[#6B7280]">Selecione arquivos acima</Button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#F5F5F5]">Seus Arquivos ({arquivosLabel})</p>
                    <Button type="button" size="sm" variant="outline" className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]" onClick={handleAdicionarMaisGuia}>+ Adicionar mais</Button>
                  </div>
                  <div className="space-y-2">
                    {filesGuia.map((file, index) => (
                      <div key={file.name + file.lastModified + index} className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/15 bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] transition-colors hover:border-[#D4A017]/30">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">{isImage(file) ? (<ImageIcon className="h-4 w-4" />) : (<FileText className="h-4 w-4" />)}</span>
                          <div className="min-w-0 flex-1"><p className="truncate text-[11px] sm:text-xs">{file.name}</p><p className="mt-0.5 text-[10px] text-[#6B7280]">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                        </div>
                        <button type="button" onClick={() => handleRemoverArquivoGuia(index)} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#D4A017]/15 bg-black/50 text-[#9CA3AF] hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] disabled:opacity-70" disabled={isUploading || filesGuia.length === 0} onClick={handleUploadGuiaAutorizacao}>{isUploading ? "Processando..." : "Processar Guia"}</Button>
                  <Button type="button" variant="ghost" className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]" onClick={() => setView("pergunta_guia_autorizacao")} disabled={isUploading}>Voltar</Button>
                </>
              )}
            </div>
          )}

          {view === "upload_descricao" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input id="files-upload-descricao" ref={fileInputRefDescricao} type="file" multiple className="hidden" accept="image/*,image/heic,image/heif,.heic,.heif,application/pdf" onChange={handleFileChangeDescricao} />
              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">{medicoNome ? \`Dr. \${medicoNome},\` : "Doutor(a),"}</h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesDescricao.length === 0 ? (<><span>Faça upload da{" "}<span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">Descrição Cirúrgica</span>.</span><br /><span className="text-[11px] text-[#6B7280] sm:text-xs">Envie imagens nítidas ou PDF para extrair os procedimentos com precisão.</span></>) : (<>Confira os arquivos antes de enviar a{" "}<span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">Descrição Cirúrgica</span></>)}
                </p>
              </div>
              {filesDescricao.length === 0 ? (
                <>
                  <label htmlFor="files-upload-descricao" className="cursor-pointer rounded-2xl border-2 border-dashed border-[#D4A017]/30 bg-[#1a1a1a] p-8 text-center transition-all hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] shadow-[0_0_30px_rgba(212,160,23,0.4)]"><Scissors className="h-8 w-8 text-black" /></div>
                      <p className="font-medium text-[#F5F5F5]">Adicionar Arquivos</p>
                      <p className="text-sm text-[#9CA3AF]">Câmera ou Galeria</p>
                      <p className="text-[11px] text-[#6B7280]">Formatos aceitos: PNG, JPEG, GIF, WEBP, HEIC e PDF.</p>
                    </div>
                  </label>
                  <Button type="button" disabled className="mt-8 h-11 w-full rounded-lg border border-[#D4A017]/10 bg-black/50 text-xs font-semibold text-[#6B7280]">Selecione arquivos acima</Button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#F5F5F5]">Seus Arquivos ({arquivosLabel})</p>
                    <Button type="button" size="sm" variant="outline" className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]" onClick={handleAdicionarMaisDescricao}>+ Adicionar mais</Button>
                  </div>
                  <div className="space-y-2">
                    {filesDescricao.map((file, index) => (
                      <div key={file.name + file.lastModified + index} className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/15 bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] transition-colors hover:border-[#D4A017]/30">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">{isImage(file) ? (<ImageIcon className="h-4 w-4" />) : (<FileText className="h-4 w-4" />)}</span>
                          <div className="min-w-0 flex-1"><p className="truncate text-[11px] sm:text-xs">{file.name}</p><p className="mt-0.5 text-[10px] text-[#6B7280]">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                        </div>
                        <button type="button" onClick={() => handleRemoverArquivoDescricao(index)} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#D4A017]/15 bg-black/50 text-[#9CA3AF] hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] disabled:opacity-70" disabled={isUploading || filesDescricao.length === 0} onClick={handleUploadDescricaoCirurgica}>{isUploading ? "Processando..." : "Processar Descrição"}</Button>
                  <Button type="button" variant="ghost" className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]" onClick={() => setView(autorizacaoEnviada ? "upload_guia" : "pergunta_guia_autorizacao")} disabled={isUploading}>Voltar</Button>
                </>
              )}
            </div>
          )}

          {view === "pergunta_honorarios" && (<div className="mt-2 flex w-full max-w-md flex-col"><div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#FFD700]"><FileCheck className="h-6 w-6" /></span><div><h2 className="text-lg font-semibold text-[#F5F5F5]">Gerar guia de honorários?</h2><p className="text-xs text-[#9CA3AF]">Podemos preencher automaticamente o modelo da instituição de faturamento.</p></div></div><div className="space-y-3"><Button type="button" className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]" onClick={handleGerarGuiaHonorarios}>Gerar guia automaticamente</Button><Button type="button" variant="outline" className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => void handlePularGuiaHonorarios()}>Pular esta etapa</Button></div></div></div>)}

          {view === "gerando_honorarios" && (<div className="mt-2 flex w-full max-w-md flex-col items-center"><div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FFD700]" /><h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">Gerando guia de honorários</h2><p className="mt-2 text-sm text-[#9CA3AF]">Estamos preenchendo o modelo da instituição com os dados extraídos do faturamento.</p></div></div>)}

          {view === "sem_modelo" && (<div className="mt-2 flex w-full max-w-md flex-col items-center"><div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center"><AlertCircle className="mx-auto h-10 w-10 text-[#D4A017]" /><h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">Modelo de guia não encontrado</h2><p className="mt-2 text-sm text-[#9CA3AF]">Não existe um modelo configurado para a instituição selecionada.</p><div className="mt-6 space-y-3"><Button type="button" variant="outline" className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => setView("pergunta_honorarios")}>Voltar</Button><Button type="button" className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black" onClick={() => void handlePularGuiaHonorarios()}>Continuar sem guia</Button></div></div></div>)}

          {view === "preview_honorarios" && (<div className="flex w-full max-w-5xl flex-col gap-4"><div className="flex flex-col gap-3 rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-[#F5F5F5]">Preview da guia de honorários</h2><p className="text-xs text-[#9CA3AF]">Revise o documento antes de concluir o faturamento.</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => setGuiaZoom((prev) => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(2))))}>- Zoom</Button><Button type="button" variant="outline" className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => setGuiaZoom((prev) => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(2))))}>+ Zoom</Button><span className="rounded-full border border-[#D4A017]/20 px-3 py-1 text-xs text-[#D4A017]">{Math.round(guiaZoom * 100)}%</span></div></div><div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4"><div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]"><span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1"><Building2 className="h-3.5 w-3.5 text-[#D4A017]" />Cirurgia: {selectedHospitalName || "Não informado"}</span><span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1"><CircleDollarSign className="h-3.5 w-3.5 text-[#D4A017]" />Faturamento: {selectedClinicaName || "Não informado"}</span></div><div className="overflow-auto rounded-2xl bg-white p-4"><div ref={guiaPreviewRef} className="origin-top transition-transform" style={{ transform: `scale(${guiaZoom})`, transformOrigin: "top left", width: \`\${100 / guiaZoom}%\` }} dangerouslySetInnerHTML={{ __html: htmlGuiaPreenchida }} /></div></div><div className="grid gap-3 sm:grid-cols-3"><Button type="button" variant="outline" className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => setView("pergunta_honorarios")}>Voltar</Button><Button type="button" variant="outline" className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={pdfGerado ? handleBaixarPdf : () => void handleGerarPdf()} disabled={isGeneratingPdf}>{isGeneratingPdf ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PDF...</>) : pdfGerado ? (<><Download className="mr-2 h-4 w-4" />Baixar PDF</>) : (<><Download className="mr-2 h-4 w-4" />Gerar PDF</>)}</Button><Button type="button" className="h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]" onClick={() => void handleAvancarAposPreview()}>Concluir faturamento</Button></div></div>)}

          {view === "success" && (<div className="flex w-full flex-1 items-center justify-center"><div className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h2 className="mt-4 text-2xl font-semibold text-[#F5F5F5]">Faturamento concluído</h2><p className="mt-2 text-sm text-[#9CA3AF]">Seus documentos foram processados e o fluxo foi finalizado com sucesso.</p><div className="mt-6 space-y-3"><Button type="button" className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black" onClick={handleNovaDescricao}>Iniciar novo faturamento</Button><Button type="button" variant="outline" className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10" onClick={() => navigate("/medico/faturamentos")}>Ir para meus faturamentos</Button></div></div></div>)}
        </main>
      </div>

      {showAnalyzingScreen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"><Card className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-[#111111] text-[#F5F5F5] shadow-2xl"><CardContent className="p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A017]/15 text-[#FFD700]"><Brain className="h-7 w-7" /></div><h3 className="mt-4 text-lg font-semibold">{getAnalyzingDocTitle()}</h3><p className="mt-2 text-sm text-[#9CA3AF]">{getAnalyzingStepDescription()}</p><Progress value={analyzingProgress} className="mt-5 h-2 bg-white/10" /><p className="mt-3 text-xs text-[#D4A017]">{analyzingProgress}% concluído</p></CardContent></Card></div>)}

      {showConsistencyTable && (<div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"><ConsistencyResultsTable results={allConsistencyResults} onVoltar={() => { setShowConsistencyTable(false); setPendingNavigation(null); setView("upload_descricao"); }} onContinue={() => { void (async () => { if (faturamentoId) { await markResultsAsIgnored(faturamentoId, "apos_descricao_cirurgica"); } setShowConsistencyTable(false); const nextAction = pendingNavigation; setPendingNavigation(null); nextAction?.(); })(); }} /></div>)}

      <ProcedureReviewDialog open={showProcedureReview} procedimentos={procedimentosRevisao} faturamentoId={faturamentoId} userId={currentUserId} onConfirm={handleProcedureReviewConfirm} onClose={handleProcedureReviewClose} onProcedimentosUpdated={setProcedimentosRevisao} />

      {showEmailDialog && faturamentoId ? (<SendBillingEmailsDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} faturamentoId={faturamentoId} userEmail={medicoEmail} userName={medicoNome} userCrm={medicoCrm} instituicaoCirurgiaNome={selectedHospitalName} instituicaoFaturamentoNome={selectedClinicaName} instituicoesDiferentes={selectedHospitalId !== selectedClinicaId} onEmailsSent={handleEmailsSent} onSkip={handleSkipEmails} />) : null}
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;
`;

const lines = content.split('\\n');
const cutoffIndex = lines.findIndex(line => line.includes('{medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}'));

if (cutoffIndex !== -1) {
  content = lines.slice(0, cutoffIndex).join('\\n') + "\\n" + missingPart;
  fs.writeFileSync(path, content);
  console.log("File patched successfully!");
} else {
  console.log("Cutoff not found, attempting to append to end if not closed.");
}
