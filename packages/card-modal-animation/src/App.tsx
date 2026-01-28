import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

interface CardData {
  id: number
  title: string
  content: string
  image: string
}

const sampleCards: CardData[] = [
  {
    id: 1,
    title: '精美美食',
    content: '这是一道非常美味的菜品，食材新鲜，做法讲究，让人垂涎欲滴。',
    image: 'https://picsum.photos/300/200?random=1'
  },
  {
    id: 2,
    title: '旅行风景',
    content: '美丽的风景让人流连忘返，这里有着壮丽的山河和宁静的湖泊。',
    image: 'https://picsum.photos/300/200?random=2'
  },
  {
    id: 3,
    title: '时尚穿搭',
    content: '最新时尚潮流，精选搭配让你的造型更加出众。',
    image: 'https://picsum.photos/300/200?random=3'
  },
  {
    id: 4,
    title: '家居设计',
    content: '温馨舒适的家居环境，让生活更加美好。',
    image: 'https://picsum.photos/300/200?random=4'
  },
  {
    id: 5,
    title: '创意手工',
    content: '手工制作的精美工艺品，展现无限创意。',
    image: 'https://picsum.photos/300/200?random=5'
  },
  {
    id: 6,
    title: '运动健身',
    content: '健康的生活方式，从运动开始。',
    image: 'https://picsum.photos/300/200?random=6'
  }
]

function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selectedCard = sampleCards.find(card => card.id === selectedId)

  return (
    <div className="app">
      <h1 className="app-title">小红书风格卡片动画 (Framer Motion)</h1>
      <div className="card-grid">
        {sampleCards.map((card) => (
          <motion.div
            key={card.id}
            layoutId={`card-container-${card.id}`}
            className="card"
            onClick={() => setSelectedId(card.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: card.id * 0.1 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.img
              src={card.image}
              alt={card.title}
              className="card-image"
              layoutId={`card-image-${card.id}`}
            />
            <motion.div className="card-content" layoutId={`card-content-${card.id}`}>
              <motion.h3 className="card-title" layoutId={`card-title-${card.id}`}>
                {card.title}
              </motion.h3>
              <motion.p className="card-text" layoutId={`card-text-${card.id}`}>
                {card.content}
              </motion.p>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && selectedCard && (
          <motion.div
            className="modal-overlay"
            onClick={() => setSelectedId(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{
                scale: 0.8,
                opacity: 0,
                y: 50
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
                y: 50,
                transition: { duration: 0.3, ease: "easeInOut" }
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                delay: 0.1
              }}
            >
              <motion.button
                className="modal-close"
                onClick={() => setSelectedId(null)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.2, delay: 0.1 }
                }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>

              <motion.img
                src={selectedCard.image}
                alt={selectedCard.title}
                className="modal-image"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{
                  scale: 0.9,
                  opacity: 0,
                  transition: { duration: 0.3, delay: 0.05 }
                }}
                transition={{ delay: 0.2 }}
              />

              <motion.div
                className="modal-body"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: 30,
                  transition: { duration: 0.2, delay: 0.1 }
                }}
                transition={{ delay: 0.25 }}
              >
                <motion.h2
                  className="modal-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: 20,
                    transition: { duration: 0.2, delay: 0.15 }
                  }}
                  transition={{ delay: 0.3 }}
                >
                  {selectedCard.title}
                </motion.h2>
                <motion.p
                  className="modal-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: 20,
                    transition: { duration: 0.2, delay: 0.2 }
                  }}
                  transition={{ delay: 0.35 }}
                >
                  {selectedCard.content}
                </motion.p>
                <motion.div
                  className="modal-details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: 20,
                    transition: { duration: 0.2, delay: 0.25 }
                  }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <p>这是详细的内容描述区域，可以放置更多信息、评论、点赞等功能。</p>
                  <p>这里可以添加更多的交互元素，比如分享按钮、收藏按钮等。</p>
                  <motion.div
                    className="modal-actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                      transition: { duration: 0.1, delay: 0.3 }
                    }}
                    transition={{ delay: 0.5 }}
                  >
                    <button className="action-btn like-btn">👍 点赞</button>
                    <button className="action-btn share-btn">📤 分享</button>
                    <button className="action-btn save-btn">💾 收藏</button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
