import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { useToast } from '@/components/feedback/Toast';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { copyToClipboard } from '@/utils/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREMIUM_PRICE = 49.9;
const FREE_MAX_STORES = 1;
const PREMIUM_MAX_STORES = 3;
const FREE_FEE_PERCENT = 7;
const PREMIUM_FEE_PERCENT = 5;

type BillingType = 'PIX' | 'CREDIT_CARD';

const onlyDigits = (value: string) => value.replace(/\D/g, '');
const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatDatePtBr = (iso?: string | null) => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString('pt-BR');
};

const formatCpfCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}.${p2}`;
    if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
    return `${p1}.${p2}.${p3}-${p4}`;
  }
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  if (digits.length <= 2) return p1;
  if (digits.length <= 5) return `${p1}.${p2}`;
  if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
  if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
};

const formatCardNumber = (value: string) =>
  onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();

const formatExpiry = (value: string) => {
  const digits = onlyDigits(value).slice(0, 6); // MMYYYY
  const month = digits.slice(0, 2);
  const year = digits.slice(2, 6);
  if (digits.length <= 2) return month;
  return `${month}/${year}`;
};

const formatPostalCode = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

const getToastTypeForHttpError = (err: any) => {
  const status = Number(err?.status || err?.statusCode);
  if (status === 429) return 'warning' as const;
  if (status === 400) return 'warning' as const;
  return 'error' as const;
};

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [billingType, setBillingType] = useState<BillingType>('PIX');

  const [planTier, setPlanTier] = useState<'free' | 'premium'>('free');
  const [planStatus, setPlanStatus] = useState<string>('active');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const [cpfCnpj, setCpfCnpj] = useState('');
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
  const [pixCopyPasteCode, setPixCopyPasteCode] = useState<string | null>(null);

  const [cardHolderName, setCardHolderName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCcv, setCardCcv] = useState('');

  const [holderName, setHolderName] = useState(user?.name || '');
  const [holderEmail, setHolderEmail] = useState(user?.email || '');
  const [holderCpfCnpj, setHolderCpfCnpj] = useState('');
  const [holderPostalCode, setHolderPostalCode] = useState('');
  const [holderAddressNumber, setHolderAddressNumber] = useState('');
  const [holderAddressComplement, setHolderAddressComplement] = useState('');
  const [holderPhone, setHolderPhone] = useState('');

  const periodEndLabel = useMemo(
    () => formatDatePtBr(currentPeriodEnd),
    [currentPeriodEnd],
  );

  const isPremium = Boolean(hasPremiumAccess);
  const isCancellingPending = planStatus === 'canceled_pending';

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const status = await api.getPremiumSubscriptionStatus();
      setPlanTier(status.plan_tier || 'free');
      setPlanStatus(status.plan_status || 'active');
      setCurrentPeriodEnd(status.current_period_end || null);
      setHasPremiumAccess(Boolean(status.has_premium_access));
      setSubscriptionId(status.subscription_id || null);
    } catch (err: any) {
      showToast(
        err?.message || 'Não foi possível carregar seu plano.',
        getToastTypeForHttpError(err),
      );
    } finally {
      setLoadingStatus(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleFetchPix = useCallback(async () => {
    try {
      const res = await api.getPremiumSubscriptionPix();
      const pix = res?.pix || null;
      if (!pix) {
        showToast('Nenhum PIX pendente encontrado.', 'info');
        return;
      }
      setPixQrCodeImage(pix.qr_code_image || null);
      setPixCopyPasteCode(pix.copy_paste_code || null);
    } catch (err: any) {
      showToast(
        err?.message || 'Não foi possível obter o PIX.',
        getToastTypeForHttpError(err),
      );
    }
  }, [showToast]);

  const handleCopyPix = async () => {
    if (!pixCopyPasteCode) return;
    await copyToClipboard(pixCopyPasteCode);
    showToast('Código PIX copiado.', 'success');
  };

  const handleSubscribe = async () => {
    if (isPremium) {
      showToast('Seu Premium já está ativo.', 'info');
      return;
    }

    setSubscribing(true);
    try {
      setPixQrCodeImage(null);
      setPixCopyPasteCode(null);

            if (billingType === 'PIX') {
        const digits = onlyDigits(cpfCnpj);
        if (digits.length !== 11 && digits.length !== 14) {
          showToast(
            'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) para gerar o PIX.',
            'warning',
          );
          return;
        }

        const res = await api.subscribePremium({
          billingType: 'PIX',
          cpfCnpj: digits,
        });

        setSubscriptionId(res.subscription_id || null);

        const pix = res?.pix || null;
        if (pix?.qr_code_image || pix?.copy_paste_code) {
          setPixQrCodeImage(pix.qr_code_image || null);
          setPixCopyPasteCode(pix.copy_paste_code || null);
        } else {
          await handleFetchPix();
        }

        showToast('PIX gerado. Faça o pagamento para ativar.', 'success');
        await loadStatus();
        return;
      }

      const numberDigits = onlyDigits(cardNumber);
      const ccvDigits = onlyDigits(cardCcv);
      const expiryDigits = onlyDigits(cardExpiry);
      const expiryMonth = expiryDigits.slice(0, 2);
      const expiryYear = expiryDigits.slice(2, 6);

      if (!cardHolderName.trim()) throw new Error('Informe o nome no cartão.');
      if (numberDigits.length < 13) throw new Error('Número do cartão inválido.');
      if (expiryMonth.length !== 2 || expiryYear.length !== 4) {
        throw new Error('Validade inválida.');
      }
      if (ccvDigits.length < 3) throw new Error('CVV inválido.');

      const holderCpfDigits = onlyDigits(holderCpfCnpj);
      const postalDigits = onlyDigits(holderPostalCode);

      if (!holderName.trim()) throw new Error('Informe o nome do titular.');
      if (!holderEmail.trim()) throw new Error('Informe o e-mail do titular.');
      if (holderCpfDigits.length !== 11 && holderCpfDigits.length !== 14) {
        throw new Error('CPF/CNPJ do titular inválido.');
      }
      if (postalDigits.length !== 8) throw new Error('CEP inválido.');
      if (!holderAddressNumber.trim()) throw new Error('Número do endereço é obrigatório.');
      if (!onlyDigits(holderPhone)) throw new Error('Telefone do titular é obrigatório.');

      const res = await api.subscribePremium({
        billingType: 'CREDIT_CARD',
        creditCard: {
          holderName: cardHolderName.trim(),
          number: numberDigits,
          expiryMonth,
          expiryYear,
          ccv: ccvDigits,
        },
        creditCardHolderInfo: {
          name: holderName.trim(),
          email: holderEmail.trim(),
          cpfCnpj: holderCpfDigits,
          postalCode: postalDigits,
          addressNumber: holderAddressNumber.trim(),
          ...(holderAddressComplement.trim()
            ? { addressComplement: holderAddressComplement.trim() }
            : {}),
          phone: onlyDigits(holderPhone),
        },
      });

      setSubscriptionId(res.subscription_id || null);
      showToast('Assinatura criada. Aguarde a confirmação.', 'success');
      await loadStatus();
    } catch (err: any) {
      showToast(
        err?.message || 'Não foi possível iniciar a assinatura.',
        getToastTypeForHttpError(err),
      );
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar renovação',
      periodEndLabel
        ? `Você continuará com acesso Premium até ${periodEndLabel}. Deseja cancelar a renovação automática?`
        : 'Deseja cancelar a renovação automática?',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar renovação',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.cancelPremiumSubscription();
              showToast('Cancelamento solicitado.', 'success');
              await loadStatus();
            } catch (err: any) {
              showToast(err?.message || 'Não foi possível cancelar.', 'error');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loadingStatus) {
    return (
      <GradientBackground variant="hero">
        <View style={[styles.loading, { paddingTop: insets.top + 40 }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando seu plano...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="hero">
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>VenceJá Premium</Text>
          <TouchableOpacity onPress={loadStatus} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={isPremium ? 'checkmark-circle' : 'sparkles'}
                size={20}
                color={isPremium ? Colors.success : Colors.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {isPremium ? 'Premium ativo' : 'Plano Grátis'}
              </Text>
              <Text style={styles.statusSub}>
                {isPremium
                  ? periodEndLabel
                    ? `Ativo até ${periodEndLabel}`
                    : 'Ativo'
                  : `Limite: ${FREE_MAX_STORES} loja • Taxa: ${FREE_FEE_PERCENT}%`}
              </Text>
            </View>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>{formatBRL(PREMIUM_PRICE)}/mês</Text>
            </View>
          </View>

          {isPremium && isCancellingPending && (
            <View style={styles.warnBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.warning} />
              <Text style={styles.warnText}>
                Renovação cancelada. Você mantém o acesso até o fim do período.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Benefícios</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="storefront" size={18} color={Colors.primary} />
            <Text style={styles.benefitText}>
              Até {PREMIUM_MAX_STORES} lojas (Grátis: {FREE_MAX_STORES})
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="cash" size={18} color={Colors.secondary} />
            <Text style={styles.benefitText}>
              Taxa plataforma {PREMIUM_FEE_PERCENT}% (Grátis: {FREE_FEE_PERCENT}%)
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="time" size={18} color={Colors.info} />
            <Text style={styles.benefitText}>
              Cancelamento estilo streaming: vale até o fim do período pago
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Como funciona</Text>
          <Text style={styles.body}>
            1) Escolha PIX ou cartão {'\n'}
            2) Finalize o pagamento {'\n'}
            3) Ativação automática após confirmação do Asaas
          </Text>
        </View>

        {!isPremium && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pagamento</Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  billingType === 'PIX' && styles.toggleBtnActive,
                ]}
                onPress={() => setBillingType('PIX')}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="qr-code"
                  size={18}
                  color={billingType === 'PIX' ? Colors.textOnPrimary : Colors.text}
                />
                <Text
                  style={[
                    styles.toggleText,
                    billingType === 'PIX' && styles.toggleTextActive,
                  ]}
                >
                  PIX
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  billingType === 'CREDIT_CARD' && styles.toggleBtnActive,
                ]}
                onPress={() => setBillingType('CREDIT_CARD')}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="card"
                  size={18}
                  color={
                    billingType === 'CREDIT_CARD' ? Colors.textOnPrimary : Colors.text
                  }
                />
                <Text
                  style={[
                    styles.toggleText,
                    billingType === 'CREDIT_CARD' && styles.toggleTextActive,
                  ]}
                >
                  Cartão
                </Text>
              </TouchableOpacity>
            </View>

            {billingType === 'PIX' ? (
              <>
                <Input
                  label="CPF/CNPJ"
                  required
                  placeholder="CPF (11) ou CNPJ (14)"
                  leftIcon="id-card"
                  keyboardType="numeric"
                  value={cpfCnpj}
                  onChangeText={(t) => setCpfCnpj(formatCpfCnpj(t))}
                />

                {(pixQrCodeImage || pixCopyPasteCode) && (
                  <View style={styles.pixCard}>
                    <Text style={styles.pixTitle}>Pague com PIX</Text>
                    <Text style={styles.pixSub}>
                      Escaneie o QR Code ou copie o código.
                    </Text>

                    {pixQrCodeImage ? (
                      <View style={styles.qrBox}>
                        <Image
                          source={{ uri: pixQrCodeImage }}
                          style={styles.qrImage}
                          contentFit="contain"
                        />
                      </View>
                    ) : null}

                    {pixCopyPasteCode ? (
                      <>
                        <View style={styles.codeBox}>
                          <Text style={styles.codeText} selectable>
                            {pixCopyPasteCode}
                          </Text>
                        </View>
                        <Button
                          title="Copiar código PIX"
                          onPress={handleCopyPix}
                          variant="primary"
                          size="lg"
                          leftIcon={<Ionicons name="copy" size={18} color={Colors.text} />}
                          fullWidth
                        />
                      </>
                    ) : (
                      <Button
                        title="Atualizar PIX"
                        onPress={handleFetchPix}
                        variant="outline"
                        size="lg"
                        fullWidth
                      />
                    )}

                    <View style={styles.actionsRow}>
                      <Button
                        title="Atualizar status"
                        onPress={loadStatus}
                        variant="secondary"
                        size="md"
                        fullWidth
                      />
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.smallNote}>
                  Cartão exige dados do titular (Asaas). Não salvamos seus dados no app.
                </Text>
                <Input
                  label="Nome no cartão"
                  placeholder="Como está no cartão"
                  leftIcon="person"
                  value={cardHolderName}
                  onChangeText={setCardHolderName}
                  autoCapitalize="words"
                />
                <Input
                  label="Número do cartão"
                  placeholder="0000 0000 0000 0000"
                  leftIcon="card"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Validade"
                      placeholder="MM/AAAA"
                      leftIcon="calendar"
                      keyboardType="numeric"
                      value={cardExpiry}
                      onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="CVV"
                      placeholder="000"
                      leftIcon="key"
                      keyboardType="numeric"
                      value={cardCcv}
                      onChangeText={(t) => setCardCcv(onlyDigits(t).slice(0, 4))}
                    />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Titular</Text>
                <Input
                  label="Nome"
                  placeholder="Nome completo"
                  leftIcon="person-outline"
                  value={holderName}
                  onChangeText={setHolderName}
                  autoCapitalize="words"
                />
                <Input
                  label="E-mail"
                  placeholder="email@exemplo.com"
                  leftIcon="mail"
                  keyboardType="email-address"
                  value={holderEmail}
                  onChangeText={setHolderEmail}
                  autoCapitalize="none"
                />
                <Input
                  label="CPF/CNPJ"
                  placeholder="Digite o CPF/CNPJ do titular"
                  leftIcon="id-card-outline"
                  keyboardType="numeric"
                  value={holderCpfCnpj}
                  onChangeText={(t) => setHolderCpfCnpj(formatCpfCnpj(t))}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      leftIcon="location"
                      keyboardType="numeric"
                      value={holderPostalCode}
                      onChangeText={(t) => setHolderPostalCode(formatPostalCode(t))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Número"
                      placeholder="123"
                      leftIcon="home"
                      value={holderAddressNumber}
                      onChangeText={setHolderAddressNumber}
                    />
                  </View>
                </View>
                <Input
                  label="Complemento (opcional)"
                  placeholder="Apto, bloco, etc."
                  leftIcon="add-circle-outline"
                  value={holderAddressComplement}
                  onChangeText={setHolderAddressComplement}
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  leftIcon="call"
                  keyboardType="phone-pad"
                  value={holderPhone}
                  onChangeText={setHolderPhone}
                />
              </>
            )}
          </View>
        )}

        {subscriptionId && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gerenciar</Text>
            <Text style={styles.body}>
              {planTier === 'premium'
                ? periodEndLabel
                  ? `Renova em ${periodEndLabel}`
                  : 'Renovação ativa'
                : 'Sua conta não está premium no momento.'}
            </Text>
            <Button
              title={isCancellingPending ? 'Renovação já cancelada' : 'Cancelar renovação'}
              onPress={handleCancel}
              variant={isCancellingPending ? 'outline' : 'danger'}
              size="lg"
              loading={cancelling}
              disabled={isCancellingPending || !isPremium}
              fullWidth
            />
          </View>
        )}
      </ScrollView>

      {!isPremium && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 18 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomLabel}>Premium</Text>
            <Text style={styles.bottomValue}>{formatBRL(PREMIUM_PRICE)}/mês</Text>
          </View>
          <Button
            title={billingType === 'PIX' ? 'Gerar PIX' : 'Assinar'}
            onPress={handleSubscribe}
            variant="gradient"
            size="lg"
            loading={subscribing}
            style={{ flex: 1 }}
            leftIcon={
              <Ionicons
                name={billingType === 'PIX' ? 'qr-code' : 'card'}
                size={18}
                color={Colors.textOnPrimary}
              />
            }
          />
        </View>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...DesignTokens.typography.h2,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  statusSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: Colors.primary15,
    borderWidth: 1,
    borderColor: Colors.primary20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.warning10,
    borderWidth: 1,
    borderColor: Colors.warning20,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 6,
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  toggleTextActive: {
    color: Colors.textOnPrimary,
  },
  smallNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  pixCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginTop: 8,
  },
  pixTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  pixSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  qrBox: {
    width: '100%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  codeBox: {
    width: '100%',
    backgroundColor: Colors.glass,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    ...DesignTokens.shadows.lg,
  },
  bottomLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  bottomValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
});
